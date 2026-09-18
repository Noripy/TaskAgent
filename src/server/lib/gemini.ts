/**
 * Gemini API（REST 直叩き）。SDK を使わないのは Worker のバンドルを小さく保つため。
 * GEMINI_BASE_URL を Cloudflare AI Gateway に向ければキャッシュ・ログ・レート制限が無料で付く。
 */
export interface GeminiClient {
  generateJson(input: {
    system: string;
    user: string;
    schema: object;
    temperature?: number;
  }): Promise<string>;
}

export class GeminiError extends Error {
  override readonly name = "GeminiError";
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export function createGeminiClient(opts: {
  apiKey: string;
  model: string;
  baseUrl?: string | undefined;
  fetchImpl: typeof fetch;
}): GeminiClient {
  const base = (opts.baseUrl ?? "https://generativelanguage.googleapis.com").replace(/\/+$/, "");
  const url = `${base}/v1beta/models/${opts.model}:generateContent`;
  return {
    async generateJson({ system, user, schema, temperature = 0.3 }) {
      const body = {
        // 安定部分（system）を先頭に置くとプロバイダ側の暗黙キャッシュが効きやすい
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
        },
      };
      const res = await opts.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new GeminiError(`Gemini ${res.status}: ${text.slice(0, 300)}`, res.status);
      }
      const json = (await res.json()) as GeminiResponse;
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text)
        throw new GeminiError(
          `Gemini returned no text (finishReason=${json.candidates?.[0]?.finishReason ?? "?"})`,
        );
      return text;
    },
  };
}

interface GeminiResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}
