import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { CATEGORIES } from "@/lib/constants/categories";

const visionModel = google(
  process.env.AI_VISION_MODEL ?? "gemini-2.5-flash",
);

const DetectedTransactionSchema = z.object({
  app: z
    .string()
    .nullable()
    .describe("Sender app or bank name shown in the notification, if visible"),
  kind: z
    .enum(["expense", "income"])
    .describe(
      "expense if money leaves the user (spent, sent, paid, charge, fee). income otherwise (received, refund, deposit, salary).",
    ),
  amount: z
    .number()
    .positive()
    .describe("Absolute amount, no sign, no thousand separators"),
  currency: z
    .string()
    .min(3)
    .max(5)
    .describe(
      "ISO 4217 code (USD, EUR, VND, ARS, etc.). USDT if shown as ₮ or stablecoin. Infer from symbol when missing.",
    ),
  occurredOn: z
    .string()
    .nullable()
    .describe("Date in YYYY-MM-DD if explicit in the notification, else null"),
  description: z
    .string()
    .nullable()
    .describe("Merchant / payee / payer / category. null if not shown."),
  category: z
    .enum(CATEGORIES)
    .nullable()
    .describe(
      "Best matching spending category given the merchant and items (a coffee shop receipt = Coffee, a restaurant = Food, a supermarket = Groceries, a taxi = Transport). null if unclear.",
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "Confidence in the parse. low if multiple fields were guessed.",
    ),
});

export type DetectedTransaction = z.infer<typeof DetectedTransactionSchema>;

const SCHEMA = z.object({
  items: z.array(DetectedTransactionSchema),
  ignored: z
    .number()
    .int()
    .min(0)
    .describe("Count of unrelated notifications in the image (chat, social, etc.)"),
});

const SYSTEM = `You parse screenshots of phone notifications and bank/wallet alerts.

Rules:
- Read every notification visible in the image.
- For each that reports a money movement (purchase, charge, transfer, refund, salary, deposit, withdrawal, refund), emit ONE item.
- Ignore non-financial notifications (chat, social, calendar, weather). Count them in "ignored".
- amount must be positive, no sign. Use kind=expense for outgoing money, kind=income for incoming.
- currency must be an ISO 4217 code. If only a symbol is shown, infer (e.g. $ in a Wise notif = USD unless context says otherwise, € = EUR, ₫ = VND, ₮ = USDT, ¥ = JPY).
- occurredOn: only set if the notification shows a specific date. Otherwise null (the user will default to today).
- description: short merchant or payee name. Strip prefixes like "at", "to", "from".
- confidence:
  - high: every field came directly from the image text.
  - medium: one field had to be inferred (currency from symbol, kind from verb).
  - low: more than one field guessed, or the text was partially cropped.

Return strict JSON matching the schema. Empty items array is fine if the image has no financial content.`;

const RECEIPT_SYSTEM = `You parse photos of purchase receipts, bills and invoices.

Rules:
- Emit ONE item per receipt with the final TOTAL paid (after tax, tip and discounts). Never emit line items.
- If the photo shows multiple distinct receipts, emit one item each.
- kind is "expense", unless the document is clearly a refund or credit note (then "income").
- amount must be the total, positive, no sign, no thousand separators.
- currency must be an ISO 4217 code. Infer from the symbol or the receipt's country/language when not printed (₫ or "đ" = VND, $ = USD unless context says otherwise, € = EUR).
- occurredOn: the printed receipt date in YYYY-MM-DD if visible, else null (the user will default to today).
- description: the merchant or store name as printed.
- app: always null.
- confidence:
  - high: total, currency and merchant came directly from the print.
  - medium: one field had to be inferred.
  - low: more than one field guessed, or the photo is partially unreadable.

Return strict JSON matching the schema. "ignored" is 0 unless the image contains clearly non-receipt content. Empty items array is fine if no receipt is readable.`;

export type ExtractMode = "screenshot" | "receipt";

const PROMPTS: Record<ExtractMode, { system: string; instruction: string }> = {
  screenshot: {
    system: SYSTEM,
    instruction: "Extract every financial notification from this screenshot.",
  },
  receipt: {
    system: RECEIPT_SYSTEM,
    instruction: "Extract the purchase total from this receipt photo.",
  },
};

export async function extractFromImage(
  image: {
    data: ArrayBuffer | Uint8Array;
    mimeType: string;
  },
  mode: ExtractMode = "screenshot",
): Promise<{ items: DetectedTransaction[]; ignored: number }> {
  const buffer =
    image.data instanceof Uint8Array ? image.data : new Uint8Array(image.data);
  const prompt = PROMPTS[mode];

  const result = await generateObject({
    model: visionModel,
    schema: SCHEMA,
    system: prompt.system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt.instruction,
          },
          {
            type: "image",
            image: buffer,
            mediaType: image.mimeType,
          },
        ],
      },
    ],
  });

  return result.object;
}
