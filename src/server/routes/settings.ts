import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../app.js";
import { decryptString } from "../lib/crypto.js";
import { checkRepoWritable } from "../lib/github.js";
import { publicUser } from "./auth.js";

const ghName = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_.-]+$/, "英数字 . _ - のみ");

const settingsSchema = z.object({
  repo_owner: ghName,
  repo_name: ghName,
  repo_branch: z.string().trim().min(1).max(200).default("main"),
  repo_path_prefix: z
    .string()
    .trim()
    .max(100)
    .regex(/^[A-Za-z0-9_./-]*$/)
    .default("notes"),
  timezone: z.string().trim().min(1).max(64).default("Asia/Tokyo"),
  digest_hour: z.number().int().min(0).max(23).default(21),
});

export const settingsRoutes = new Hono<AppEnv>().put(
  "/",
  zValidator("json", settingsSchema),
  async (c) => {
    const s = c.req.valid("json");
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: s.timezone });
    } catch {
      return c.json({ error: "invalid timezone" }, 400);
    }
    const user = c.get("user");
    const deps = c.get("deps");
    const token = await decryptString(user.encrypted_token, c.env.TOKEN_ENCRYPTION_KEY);
    const check = await checkRepoWritable(deps.fetch, token, s.repo_owner, s.repo_name);
    if (!check.ok) return c.json({ error: check.reason }, 422);
    await c.get("repo").updateUserSettings(user.id, s, deps.now().toISOString());
    return c.json({ user: publicUser({ ...user, ...s }) }, 200);
  },
);
