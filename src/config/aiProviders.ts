export const AI_PROVIDERS = {
  google: { label: "Google Gemini", defaultModel: "gemini-2.5-flash" },
  groq: { label: "Groq", defaultModel: "llama-3.3-70b-versatile" },
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as [
  AiProvider,
  ...AiProvider[],
];
