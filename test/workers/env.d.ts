import type { D1Migration } from "@cloudflare/vitest-pool-workers";
import type { Bindings } from "../../src/server/env.js";

// `cloudflare:test` の env は `Cloudflare.Env` 型。アプリの Bindings とテスト専用バインディングを合成する。
declare global {
  namespace Cloudflare {
    interface Env extends Bindings {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
