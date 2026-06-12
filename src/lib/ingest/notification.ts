import { CURRENCIES } from "@/config/currencies";

export interface NotificationInput {
  app?: string | null;
  title?: string | null;
  text: string;
}

export interface ParsedNotification {
  kind: "income" | "expense";
  amount: number;
  currency: string;
  description: string | null;
}

const CODES = new Set(CURRENCIES.map((c) => c.code));

const SYMBOL_TO_CODE: Record<string, string> = {
  "€": "EUR",
  "£": "GBP",
  "₫": "VND",
  "฿": "THB",
  "₱": "PHP",
  "₩": "KRW",
  "₹": "INR",
  "₺": "TRY",
  "₲": "PYG",
  "₾": "GEL",
  "₮": "USDT",
};

const INCOME_RE =
  /\b(received|sent you|paid you|refund(?:ed)?|credited|added money|deposit(?:ed)?|top(?:ped)?[ -]?up|you got)\b/i;
const EXPENSE_RE =
  /\byou (?:just )?(?:spent|paid|sent|bought)\b|\b(?:debited|withdrew|charged|purchase|payment to)\b/i;

const MERCHANT_RE = /\b(?:at|to|from)\s+(.+?)(?:[.!\n]|$)/i;

function parseNumber(raw: string): number | null {
  const s = raw.replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return null;
  const dec = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (dec === -1) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  const intPart = s.slice(0, dec).replace(/[.,]/g, "");
  const fracPart = s.slice(dec + 1).replace(/[.,]/g, "");
  const n = Number(`${intPart}.${fracPart}`);
  return Number.isFinite(n) ? n : null;
}

function findCurrency(
  text: string,
  defaultCurrency?: string,
): { code: string; at: number } | null {
  const upper = text.toUpperCase();
  let best: { code: string; at: number } | null = null;
  for (const code of CODES) {
    const at = upper.search(new RegExp(`\\b${code}\\b`));
    if (at !== -1 && (!best || at < best.at)) best = { code, at };
  }
  for (const [sym, code] of Object.entries(SYMBOL_TO_CODE)) {
    const at = text.indexOf(sym);
    if (at !== -1 && (!best || at < best.at)) best = { code, at };
  }
  if (!best) {
    const at = text.search(/[$¥]/);
    if (at !== -1 && defaultCurrency) best = { code: defaultCurrency, at };
  }
  return best;
}

function findAmount(text: string, near: number): number | null {
  const matches = [...text.matchAll(/\d[\d.,]*/g)];
  if (matches.length === 0) return null;
  let best: { value: number; dist: number } | null = null;
  for (const m of matches) {
    const value = parseNumber(m[0]);
    if (value === null || value <= 0) continue;
    const dist = Math.abs((m.index ?? 0) - near);
    if (!best || dist < best.dist) best = { value, dist };
  }
  return best?.value ?? null;
}

function detectKind(text: string): "income" | "expense" {
  if (EXPENSE_RE.test(text)) return "expense";
  if (INCOME_RE.test(text)) return "income";
  return "expense";
}

function detectMerchant(text: string, fallback: string | null): string | null {
  const m = text.match(MERCHANT_RE);
  const raw = m?.[1]?.trim();
  if (raw) return raw.slice(0, 80);
  return fallback?.trim()?.slice(0, 80) || null;
}

export function parseNotification(
  input: NotificationInput,
  defaultCurrency?: string,
): ParsedNotification | null {
  const body = `${input.title ?? ""} ${input.text}`.trim();
  if (!body) return null;

  const currency = findCurrency(body, defaultCurrency);
  if (!currency) return null;

  const amount = findAmount(body, currency.at);
  if (amount === null) return null;

  return {
    kind: detectKind(body),
    amount,
    currency: currency.code,
    description: detectMerchant(body, input.title ?? null),
  };
}

export function sourceForApp(app?: string | null): string {
  const a = (app ?? "").toLowerCase();
  if (a === "receipt") return "receipt";
  if (a.includes("wise")) return "wise";
  if (a.includes("bybit")) return "bybit";
  if (
    a.includes("wallet") ||
    a.includes("gpay") ||
    a.includes("google pay") ||
    a.includes("nfc")
  ) {
    return "google wallet";
  }
  return "notification";
}
