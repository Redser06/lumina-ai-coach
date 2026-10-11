import { RealProviderDisabled, type Provider, type ProviderRequest, type ProviderResult } from "../types.js";

/**
 * Real provider. The network client is imported only after the env gate passes,
 * so CI (which never sets the provider and the key together) does not load it.
 */
export function assertRealProviderEnabled(): { apiKey: string; baseUrl: string } {
  if (process.env.LLM_PROVIDER !== "openai_compat") {
    throw new RealProviderDisabled("real provider disabled");
  }
  const apiKey = process.env.OPENAI_COMPAT_API_KEY ?? "";
  const baseUrl = process.env.OPENAI_COMPAT_BASE_URL ?? "";
  if (!apiKey || !baseUrl) {
    throw new RealProviderDisabled("real provider disabled");
  }
  return { apiKey, baseUrl };
}

export const openaiCompatProvider: Provider = {
  id: "openai_compat",
  async complete(request: ProviderRequest): Promise<ProviderResult> {
    const auth = assertRealProviderEnabled();
    const client = await import("./openai_compat_client.js");
    return client.openAiCompatComplete(request, auth);
  },
};
