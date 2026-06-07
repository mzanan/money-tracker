import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

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

export async function extractFromScreenshot(image: {
  data: ArrayBuffer | Uint8Array;
  mimeType: string;
}): Promise<{ items: DetectedTransaction[]; ignored: number }> {
  const buffer =
    image.data instanceof Uint8Array ? image.data : new Uint8Array(image.data);

  const result = await generateObject({
    model: visionModel,
    schema: SCHEMA,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract every financial notification from this screenshot.",
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
