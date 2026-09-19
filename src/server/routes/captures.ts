import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../app.js";
import { createGeminiFor } from "../lib/gemini-factory.js";
import { answerCapture, MemoizeStateError, startCapture } from "../services/memoize.js";

const textSchema = z.object({ text: z.string().trim().min(1, "空です").max(4000) });

function memoizeCtx(c: Context<AppEnv>) {
  const deps = c.get("deps");
  const user = c.get("user");
  const gemini = createGeminiFor(c.env, deps.fetch);
  return { repo: c.get("repo"), gemini, deps, userId: user.id, timezone: user.timezone };
}

// Hono RPC の型推論のためにメソッドチェーンで定義する（分割代入や再代入をしない）
export const captureRoutes = new Hono<AppEnv>()
  .post("/", zValidator("json", textSchema), async (c) => {
    const { text } = c.req.valid("json");
    const result = await startCapture(memoizeCtx(c), text);
    return c.json(result, 201);
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
