import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

import {
  AI_PROVIDERS,
  SHEET_IMPORT_AI,
  type AiProvider,
} from "@/lib/constants/aiProviders";

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

export function resolveSheetImportModel() {
  const apiKey = process.env.EXPLABS_API_KEY;
  if (!apiKey) throw new Error("EXPLABS_API_KEY is not set");
  return createAnthropic({
    authToken: apiKey,
    baseURL: SHEET_IMPORT_AI.baseURL,
  })(SHEET_IMPORT_AI.model);
}
