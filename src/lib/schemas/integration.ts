import { z } from "zod";

import { api_integrations } from "@/lib/db/schema";

export const MAX_INITIAL_SINCE_DAYS = 730;

export const integrationProviderSchema = z.enum(
  api_integrations.provider.enumValues,
);

const credential = z.string().max(512).nullable().optional();

export const saveIntegrationSchema = z.object({
  provider: integrationProviderSchema,
  apiKey: credential,
  apiSecret: credential,
  importIncome: z.boolean(),
  extra: z.record(z.string(), z.unknown()).optional(),
  initialSinceDays: z
    .number()
    .int()
    .positive()
    .max(MAX_INITIAL_SINCE_DAYS)
    .optional(),
});

export type SaveIntegrationInput = z.infer<typeof saveIntegrationSchema>;
