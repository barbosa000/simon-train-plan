import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGateway(apiKey: string, opts?: { structuredOutputs?: boolean }) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: opts?.structuredOutputs ?? false,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}
