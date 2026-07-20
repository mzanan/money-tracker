import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/config/aiProviders";
import { isSupportedCurrency } from "@/config/currencies";

const currencyList = z
  .array(z.string())
  .min(1, "Pick at least one currency")
  .refine((codes) => codes.every(isSupportedCurrency), {
    message: "Unsupported currency",
  })
  .refine((codes) => new Set(codes).size === codes.length, {
    message: "Duplicate currencies",
  });

export const onboardingSchema = z
  .object({
    currencies: currencyList,
    baseCurrency: z.string().min(1, "Pick a base currency"),
    timezone: z.string().trim().nullable().optional(),
  })
  .refine((data) => data.currencies.includes(data.baseCurrency), {
    message: "Base currency must be one of the selected currencies",
    path: ["baseCurrency"],
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const updateSettingsSchema = z
  .object({
    currencies: currencyList,
    baseCurrency: z.string().min(1, "Pick a base currency"),
    timezone: z.string().trim().nullable().optional(),
  })
  .refine((data) => data.currencies.includes(data.baseCurrency), {
    message: "Base currency must be one of the selected currencies",
    path: ["baseCurrency"],
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const assistantKeySchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
  model: z.string().trim().max(100).optional(),
  apiKey: z.string().trim().min(1, "Enter an API key"),
});

export type AssistantKeyInput = z.infer<typeof assistantKeySchema>;
