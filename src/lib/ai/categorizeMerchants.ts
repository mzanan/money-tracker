import { generateObject } from "ai";
import { z } from "zod";

import { CATEGORIES } from "@/lib/constants/categories";

import { chatModel } from "./provider";

const SCHEMA = z.object({
  assignments: z.array(
    z.object({
      merchant: z.string().describe("The merchant name, exactly as given"),
      category: z
        .enum([...CATEGORIES, "unknown"])
        .describe('One category, or "unknown" when it cannot be inferred'),
    }),
  ),
});

const SYSTEM = `You classify merchant names from bank statements and wallet histories into one generic spending category.

Categories: ${CATEGORIES.join(", ")}.

Rules:
- Merchants can be from any country (Vietnam, Japan, Italy, Colombia, anywhere) and any language.
- Convenience stores, supermarkets and minimarts are Groceries. Restaurants, fast food and bars are Food. Coffee shops are Coffee.
- Ride hailing, public transit and tolls are Transport. Airlines are Flights. Hotels, hostels and booking platforms are Stay.
- ATM and cash withdrawals are Cash. Subscriptions and digital services are Software. Pharmacies and clinics are Health.
- Use "unknown" for payment processors, generic wallet labels (e.g. a wallet's own pay feature), person names, or anything ambiguous. Never guess.
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
    out.set(a.merchant, a.category === "unknown" ? null : a.category);
  }
  return out;
}
