import { type Bindings, envDefaults } from "../env.js";
import { createGeminiClient, type GeminiClient } from "./gemini.js";
import { createFakeGeminiClient } from "./gemini-fake.js";

/**
 * 環境に応じて本物 / フェイクの Gemini クライアントを返す唯一の入口。
 * ルートやジョブはこれだけを呼ぶ（分岐を 1 箇所に閉じ込める）。
 */
export function createGeminiFor(env: Bindings, fetchImpl: typeof fetch): GeminiClient {
  if (env.GEMINI_FAKE === "1") return createFakeGeminiClient();
  return createGeminiClient({
    apiKey: env.GEMINI_API_KEY,
    model: envDefaults(env).model,
    baseUrl: env.GEMINI_BASE_URL,
    fetchImpl,
  });
}
