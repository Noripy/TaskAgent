import { createApp } from "./app.js";
import { createRepo } from "./db/repo.js";
import { assertEnv, type Bindings, defaultDeps, envDefaults } from "./env.js";
import { runScheduledDigests } from "./jobs/digest.js";
import { createGeminiFor } from "./lib/gemini-factory.js";

const app = createApp();

export default {
  fetch: app.fetch,

  async scheduled(_controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    assertEnv(env);
    const gemini = createGeminiFor(env, defaultDeps.fetch);
    ctx.waitUntil(
      runScheduledDigests({ env, deps: defaultDeps, repo: createRepo(env.DB), gemini }).then(
        (results) => {
          for (const r of results)
            console.log("digest", r.userId, r.date, JSON.stringify(r.outcome));
        },
      ),
    );
  },
} satisfies ExportedHandler<Bindings>;
