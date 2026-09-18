import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../app.js";
import { envDefaults } from "../env.js";
import { createGeminiClient } from "../lib/gemini.js";
import { answerCapture, MemoizeStateError, startCapture } from "../services/memoize.js";

const textSchema = z.object({ text: z.string().trim().min(1, "空です").max(4000) });

type Ctx = {
  env: AppEnv["Bindings"];
  get: <K extends keyof AppEnv["Variables"]>(k: K) => AppEnv["Variables"][K];
};

function memoizeCtx(c: Ctx) {
  const deps = c.get("deps");
  const user = c.get("user");
  const gemini = createGeminiClient({
    apiKey: c.env.GEMINI_API_KEY,
    model: envDefaults(c.env).model,
    baseUrl: c.env.GEMINI_BASE_URL,
    fetchImpl: deps.fetch,
  });
  return { repo: c.get("repo"), gemini, deps, userId: user.id, timezone: user.timezone };
}

// Hono RPC の型推論のためにメソッドチェーンで定義する（分割代入や再代入をしない）
export const captureRoutes = new Hono<AppEnv>()
  .post("/", zValidator("json", textSchema), async (c) => {
    const { text } = c.req.valid("json");
    const result = await startCapture(memoizeCtx(c), text);
    return c.json(result, 201);
  })
  .get("/:id", async (c) => {
    const capture = await c.get("repo").getCapture(c.req.param("id"), c.get("user").id);
    if (!capture) return c.json({ error: "not found" }, 404);
    const turns = await c.get("repo").listTurns(capture.id);
    return c.json({ capture, turns }, 200);
  })
  .post("/:id/answer", zValidator("json", textSchema), async (c) => {
    const capture = await c.get("repo").getCapture(c.req.param("id"), c.get("user").id);
    if (!capture) return c.json({ error: "not found" }, 404);
    try {
      const result = await answerCapture(memoizeCtx(c), capture, c.req.valid("json").text);
      return c.json(result, 200);
    } catch (e) {
      if (e instanceof MemoizeStateError) return c.json({ error: e.message }, 409);
      throw e;
    }
  });
