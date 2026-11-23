export const AI_PROVIDERS = {
  google: {
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    visionModel: "gemini-2.5-flash",
  },
  groq: {
    label: "Groq",
    defaultModel: "openai/gpt-oss-120b",
    visionModel: "qwen/qwen3.6-27b",
  },
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as [
  AiProvider,
  ...AiProvider[],
];

export const SHEET_IMPORT_AI = {
  baseURL: "https://api.experientiallabs.ai/v1",
  model: "claude-haiku-5.5",
} as const;
