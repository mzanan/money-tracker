import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";

const visionModel = groq(process.env.AI_VISION_MODEL ?? "qwen/qwen3.6-27b");

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
  amount: z.coerce
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
    .describe("Confidence in the parse. low if multiple fields were guessed."),
});

export type DetectedTransaction = z.infer<typeof DetectedTransactionSchema>;

const RawDetectedTransactionSchema = DetectedTransactionSchema.extend({
  dateText: z
    .string()
    .nullable()
    .describe(
      "Exact date text copied verbatim from the notification or receipt (e.g. 'Jul 6', '06/07/2026'). null if no calendar date is printed.",
    ),
});

const SCHEMA = z.object({
  items: z.array(RawDetectedTransactionSchema),
  ignored: z
    .number()
    .int()
    .min(0)
    .describe(
      "Count of unrelated notifications in the image (chat, social, etc.)",
    ),
});

const SYSTEM = `You parse screenshots of phone notifications and bank/wallet alerts.

Rules:
- Read every notification visible in the image.
- For each that reports a money movement (purchase, charge, transfer, refund, salary, deposit, withdrawal, refund), emit ONE item.
- A single payment often shows a second, converted amount in another currency (in parentheses, on a second line, or as "about X USD"). That is ONE movement: emit exactly ONE item with the amount and currency the merchant actually charged (the primary amount in the notification). Never emit a separate item for the converted amount.
- Ignore non-financial notifications (chat, social, calendar, weather). Count them in "ignored".
- amount must be positive, no sign. Use kind=expense for outgoing money, kind=income for incoming.
- currency must be an ISO 4217 code. If only a symbol is shown, infer (e.g. $ in a Wise notif = USD unless context says otherwise, € = EUR, ₫ = VND, ₮ = USDT, ¥ = JPY).
- occurredOn and dateText: default is null for BOTH. Only set them when an explicit calendar date (day and month, e.g. "Jul 6" or "06/07") is printed inside the notification text itself. dateText must be the date copied verbatim from the image; occurredOn is that same date converted to YYYY-MM-DD. Never derive a date from a clock time, a relative phrase ("2h ago", "yesterday", "just now"), the screenshot's status bar, or your own knowledge. If you cannot quote the printed date in dateText, occurredOn must be null.
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
- occurredOn and dateText: default is null for BOTH. Only set them when an explicit calendar date is printed on the receipt itself. dateText must be the date copied verbatim from the print; occurredOn is that same date converted to YYYY-MM-DD. Never guess a date from anything else in the photo. If you cannot quote the printed date in dateText, occurredOn must be null.
- description: the merchant or store name as printed.
- app: always null.
- confidence:
  - high: total, currency and merchant came directly from the print.
  - medium: one field had to be inferred.
  - low: more than one field guessed, or the photo is partially unreadable.

Return strict JSON matching the schema. "ignored" is 0 unless the image contains clearly non-receipt content. Empty items array is fine if no receipt is readable.`;

export type ExtractMode = "screenshot" | "receipt";

const SCHEMA_JSON = JSON.stringify(z.toJSONSchema(SCHEMA));

function parseModelJson(text: string): z.infer<typeof SCHEMA> {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Model returned no JSON object");
  }
  return SCHEMA.parse(JSON.parse(cleaned.slice(start, end + 1)));
}

function sanitizeDate(
  raw: z.infer<typeof RawDetectedTransactionSchema>,
): DetectedTransaction {
  const { dateText, ...item } = raw;
  if (!item.occurredOn) return item;
  if (!dateText || !/^\d{4}-\d{2}-\d{2}$/.test(item.occurredOn)) {
    return { ...item, occurredOn: null };
  }
  const day = String(Number(item.occurredOn.slice(8, 10)));
  const evidenceNumbers = (dateText.match(/\d+/g) ?? []).map((n) =>
    String(Number(n)),
  );
  if (!evidenceNumbers.includes(day)) {
    return { ...item, occurredOn: null };
  }
  return item;
}

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

  const result = await generateText({
    model: visionModel,
    system: `${prompt.system}\n\nJSON schema:\n${SCHEMA_JSON}\n\nReply with ONLY the JSON object, no prose, no code fences.`,
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
    providerOptions: {
      groq: { reasoningFormat: "hidden" },
    },
  });

  const object = parseModelJson(result.text);

  return {
    items: object.items.map(sanitizeDate),
    ignored: object.ignored,
  };
}
