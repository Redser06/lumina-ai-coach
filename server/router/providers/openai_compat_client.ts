import type { ProviderRequest, ProviderResult } from "../types.js";

if (process.env.CI === "true" || process.env.NO_NETWORK === "1") {
  throw new Error("openai_compat must not be imported in CI");
}

export async function openAiCompatComplete(
  request: ProviderRequest,
  auth: { apiKey: string; baseUrl: string },
): Promise<ProviderResult> {
  const started = Date.now();
  const response = await fetch(`${auth.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      temperature: 0,
      messages: [{ role: "user", content: request.prompt }],
    }),
    signal: AbortSignal.timeout(request.timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`openai_compat status ${response.status}`);
  }
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = body.choices?.[0]?.message?.content ?? "";
  return {
    text,
    tokens_in: body.usage?.prompt_tokens ?? Math.max(1, Math.ceil(request.prompt.length / 4)),
    tokens_out: body.usage?.completion_tokens ?? Math.max(1, Math.ceil(text.length / 4)),
    latency_ms: Date.now() - started,
  };
}
