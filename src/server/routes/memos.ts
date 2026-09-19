import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { isValidYmd, MemoSchema, toLocalDateString } from "../../core/index.js";
import type { AppEnv } from "../app.js";

export const memoRoutes = new Hono<AppEnv>()
  .get("/", zValidator("query", z.object({ date: z.string().optional() })), async (c) => {
    const user = c.get("user");
    const q = c.req.valid("query");
    const date = q.date ?? toLocalDateString(c.get("deps").now(), user.timezone);
    if (!isValidYmd(date)) return c.json({ error: "invalid date" }, 400);
    const rows = await c.get("repo").listMemosByDate(user.id, date);
    return c.json(
      {
        date,
        memos: rows.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          updated_at: r.updated_at,
          memo: MemoSchema.parse(JSON.parse(r.memo_json)),
        })),
      },
      200,
    );
  })
  .delete("/:id", async (c) => {
    const ok = await c.get("repo").deleteMemo(c.req.param("id"), c.get("user").id);
    if (!ok) return c.json({ error: "not found" }, 404);
    return c.json({ ok: true }, 200);
  });
