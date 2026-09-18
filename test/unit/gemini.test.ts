import { describe, expect, it, vi } from "vitest";
import { createGeminiClient, GeminiError } from "../../src/server/lib/gemini.js";

function fakeFetch(handler: (url: string, init: RequestInit) => Response) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init ?? {}),
  ) as unknown as typeof fetch;
}

describe("gemini client", () => {
  it("posts system+user with json schema and returns text", async () => {
    let captured: { url: string; body: Record<string, unknown> } | null = null;
    const fetchImpl = fakeFetch((url, init) => {
      captured = { url, body: JSON.parse(String(init.body)) };
      return Response.json({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }] });
    });
    const client = createGeminiClient({ apiKey: "k", model: "gemini-2.5-flash", fetchImpl });
    const text = await client.generateJson({ system: "S", user: "U", schema: { type: "OBJECT" } });
    expect(text).toBe('{"a":1}');
    const c = captured as unknown as { url: string; body: Record<string, unknown> };
    expect(c.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    );
    expect(c.body.systemInstruction).toEqual({ parts: [{ text: "S" }] });
    expect((c.body.generationConfig as { responseMimeType: string }).responseMimeType).toBe(
      "application/json",
    );
  });

  it("honors custom base url (AI Gateway)", async () => {
    let url = "";
    const fetchImpl = fakeFetch((u) => {
      url = u;
      return Response.json({ candidates: [{ content: { parts: [{ text: "{}" }] } }] });
    });
    await createGeminiClient({
      apiKey: "k",
      model: "m",
      baseUrl: "https://gw.example/google-ai-studio/",
      fetchImpl,
    }).generateJson({
      system: "",
      user: "",
      schema: {},
    });
    expect(url).toBe("https://gw.example/google-ai-studio/v1beta/models/m:generateContent");
  });

  it("throws GeminiError on http error", async () => {
    const fetchImpl = fakeFetch(() => new Response("quota", { status: 429 }));
    await expect(
      createGeminiClient({ apiKey: "k", model: "m", fetchImpl }).generateJson({
        system: "",
        user: "",
        schema: {},
      }),
    ).rejects.toThrow(GeminiError);
  });

  it("throws when no text candidate", async () => {
    const fetchImpl = fakeFetch(() => Response.json({ candidates: [{ finishReason: "SAFETY" }] }));
    await expect(
      createGeminiClient({ apiKey: "k", model: "m", fetchImpl }).generateJson({
        system: "",
        user: "",
        schema: {},
      }),
    ).rejects.toThrow(/SAFETY/);
  });
});
