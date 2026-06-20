import { generateObject } from "ai";
import { z } from "zod";

import { canonicalTag } from "@/lib/tags";

import { chatModel } from "./provider";

const SCHEMA = z.object({
  assignments: z.array(
    z.object({
      merchant: z.string().describe("The merchant name, exactly as given"),
      category: z
        .string()
        .nullable()
        .describe(
          "One short, general spending category (one or two words, Title Case), or null when it cannot be inferred",
        ),
    }),
  ),
});

const SYSTEM = `You classify a merchant name into one short, general spending category.

Rules:
- Merchants can be from any country or language.
- Pick a short, general category in English, Title Case, one or two words. Reuse the same category for the same kind of merchant so they stay consistent across the list.
- Return null for payment processors, generic wallet labels, person names, or anything you cannot confidently classify. Never guess.
- Return one assignment per input merchant, with the merchant string unchanged.`;

export async function aiCategorizeMerchants(
  merchants: string[],
): Promise<Map<string, string | null>> {
  const result = await generateObject({
    model: chatModel,
    schema: SCHEMA,
    system: SYSTEM,
    prompt: `Classify these merchants:\n${merchants.map((m) => `- ${m}`).join("\n")}`,
  });

  const out = new Map<string, string | null>();
  for (const merchant of merchants) out.set(merchant, null);
  for (const a of result.object.assignments) {
    if (!out.has(a.merchant)) continue;
    out.set(a.merchant, a.category ? canonicalTag(a.category) : null);
  }
  return out;
}
