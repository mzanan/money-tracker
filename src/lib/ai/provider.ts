import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

import { AI_PROVIDERS, type AiProvider } from "@/lib/constants/aiProviders";

export interface ChatModelConfig {
  provider: AiProvider;
  model: string | null;
  apiKey: string;
}

export interface VisionModelConfig {
  provider: AiProvider;
  apiKey: string;
}

function clientFor(provider: AiProvider, apiKey: string) {
  return provider === "groq"
    ? createGroq({ apiKey })
    : createGoogleGenerativeAI({ apiKey });
}

export function resolveChatModel({ provider, model, apiKey }: ChatModelConfig) {
  const modelId = model?.trim() || AI_PROVIDERS[provider].defaultModel;
  return clientFor(provider, apiKey)(modelId);
}

export function resolveVisionModel({ provider, apiKey }: VisionModelConfig) {
  return clientFor(provider, apiKey)(AI_PROVIDERS[provider].visionModel);
}
