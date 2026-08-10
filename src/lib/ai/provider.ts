import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

import { AI_PROVIDERS, type AiProvider } from "@/lib/constants/aiProviders";

export interface ChatModelConfig {
  provider: AiProvider | null;
  model: string | null;
  apiKey: string | null;
}

export function hasServerKey(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export function resolveChatModel({ provider, model, apiKey }: ChatModelConfig) {
  if (apiKey && provider) {
    const modelId = model?.trim() || AI_PROVIDERS[provider].defaultModel;
    if (provider === "groq") return createGroq({ apiKey })(modelId);
    return createGoogleGenerativeAI({ apiKey })(modelId);
  }
  return google(process.env.AI_CHAT_MODEL ?? AI_PROVIDERS.google.defaultModel);
}
