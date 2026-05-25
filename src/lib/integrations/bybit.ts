import { createHmac } from "node:crypto";

import type { IntegrationCreds, NormalizedTx } from "./index";

const BYBIT_API = "https://api.bybit.com";
const RECV_WINDOW = "5000";
const WINDOW_DAYS = 6;
const MAX_PAGES_PER_WINDOW = 20;

interface FundingHistoryRow {
  memberId?: string;
  currency: string;
  ioDirection: "I" | "O";
  txnAmt: string;
  afterAmt?: string;
  createTime: string;
  showBusiType?: string;
  showBusiTypeEn?: string;
  description?: string;
  descriptionEn?: string;
}

interface BybitResponse<T> {
  retCode: number;
  retMsg: string;
  result: { list?: T[]; nextPageCursor?: string };
}

// Funding-history rows whose business-type label matches these patterns move
// money between user-owned accounts (Funding ↔ Spot ↔ Unified, sub-accounts).
// Excluded so totals don't double-count the same money.
const INTERNAL_TYPE_PATTERNS = [
  /transfer/i,
  /trf/i,
  /asset.*exchange/i,
  /sub.account/i,
];

function isInternalMove(row: FundingHistoryRow): boolean {
  const label = row.showBusiTypeEn ?? "";
  return INTERNAL_TYPE_PATTERNS.some((p) => p.test(label));
}

function sign(
  apiKey: string,
  apiSecret: string,
  timestamp: string,
  query: string,
): string {
  const payload = `${timestamp}${apiKey}${RECV_WINDOW}${query}`;
  return createHmac("sha256", apiSecret).update(payload).digest("hex");
}

async function get<T>(
  path: string,
  params: Record<string, string>,
  creds: IntegrationCreds,
): Promise<BybitResponse<T>> {
  if (!creds.apiSecret) {
    throw new Error("Bybit: api_secret missing");
  }
  const timestamp = Date.now().toString();
  const query = new URLSearchParams(params).toString();
  const signature = sign(creds.apiKey, creds.apiSecret, timestamp, query);

  const response = await fetch(`${BYBIT_API}${path}?${query}`, {
    method: "GET",
    headers: {
      "X-BAPI-API-KEY": creds.apiKey,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": RECV_WINDOW,
      "X-BAPI-SIGN": signature,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Bybit ${path} ${response.status}: ${body.slice(0, 200)}`);
  }
  const data = (await response.json()) as BybitResponse<T>;
  if (data.retCode !== 0) {
    throw new Error(`Bybit ${path}: ${data.retMsg}`);
  }
  return data;
}

function tsToOccurred(secs: string): { occurredOn: string; occurredAt: string } {
  const ms = Number(secs) * 1000;
  const date = Number.isFinite(ms) ? new Date(ms) : new Date();
  return {
    occurredOn: date.toISOString().slice(0, 10),
    occurredAt: date.toISOString(),
  };
}

// Bybit's `showBusiTypeEn` labels we want to rename for clarity. "Airdrop" is
// what Bybit calls Pay cashback rewards on the API; users see them as
// cashback in the app, so we match that vocabulary.
const LABEL_RENAMES: Record<string, string> = {
  Airdrop: "Cashback",
};

function describe(row: FundingHistoryRow): string {
  const detail = row.descriptionEn?.trim();
  const busi = row.showBusiTypeEn?.trim();

  // Renames win over descriptionEn — they're explicit user-facing labels.
  if (busi && LABEL_RENAMES[busi]) {
    const renamed = LABEL_RENAMES[busi];
    return /^bybit\b/i.test(renamed) ? renamed : `Bybit ${renamed}`;
  }

  // Otherwise prefer descriptionEn when it's more specific than busi
  // (e.g., busi="Earn" + detail="Easy Earn | Flexible Interest Distribution").
  const raw =
    detail && (!busi || detail.length > busi.length) ? detail : busi || "movement";
  return /^bybit\b/i.test(raw) ? raw : `Bybit ${raw}`;
}

function externalIdFor(row: FundingHistoryRow): string {
  return `f:${row.currency}:${row.createTime}:${row.ioDirection}:${row.txnAmt}:${row.showBusiTypeEn ?? ""}`;
}

async function fetchWindow(
  creds: IntegrationCreds,
  fromSec: number,
  toSec: number,
  windowIdx: number,
): Promise<FundingHistoryRow[]> {
  const collected: FundingHistoryRow[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const params: Record<string, string> = {
      createTimeFrom: fromSec.toString(),
      createTimeTo: toSec.toString(),
      limit: "100",
    };
    if (cursor) params.cursor = cursor;

    const data = await get<FundingHistoryRow>(
      "/v5/asset/fundinghistory",
      params,
      creds,
    );

    const pageRows = data.result.list ?? [];
    console.log(
      `[bybit] window=${windowIdx} page=${pages} from=${new Date(fromSec * 1000).toISOString()} to=${new Date(toSec * 1000).toISOString()} returned=${pageRows.length}`,
    );

    collected.push(...pageRows);

    cursor = data.result.nextPageCursor || undefined;
    pages += 1;
  } while (cursor && pages < MAX_PAGES_PER_WINDOW);

  return collected;
}

export async function fetchTransactions(
  creds: IntegrationCreds,
  since: Date,
): Promise<NormalizedTx[]> {
  const out: NormalizedTx[] = [];
  const windowMs = WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  console.log(
    `[bybit] fetchTransactions since=${since.toISOString()} now=${new Date(now).toISOString()} windowDays=${WINDOW_DAYS}`,
  );

  let windowIdx = 0;
  let totalRaw = 0;
  let droppedInternal = 0;
  let droppedZero = 0;
  const typePairs = new Map<string, string>();

  for (let from = since.getTime(); from < now; from += windowMs) {
    const to = Math.min(from + windowMs, now);
    const rows = await fetchWindow(
      creds,
      Math.floor(from / 1000),
      Math.floor(to / 1000),
      windowIdx,
    );
    totalRaw += rows.length;

    for (const row of rows) {
      const busi = row.showBusiTypeEn?.trim() || "";
      const detail = row.descriptionEn?.trim() || "";
      if (!typePairs.has(busi)) typePairs.set(busi, detail);

      if (isInternalMove(row)) {
        droppedInternal += 1;
        continue;
      }
      const amount = Number(row.txnAmt);
      if (!Number.isFinite(amount) || amount === 0) {
        droppedZero += 1;
        continue;
      }

      const { occurredOn, occurredAt } = tsToOccurred(row.createTime);
      out.push({
        externalId: externalIdFor(row),
        kind: row.ioDirection === "I" ? "income" : "expense",
        amount: Math.abs(amount),
        currency: row.currency,
        occurredOn,
        occurredAt,
        category: null,
        note: describe(row),
      });
    }
    windowIdx += 1;
  }

  console.log(
    `[bybit] fetchTransactions done windows=${windowIdx} rawRows=${totalRaw} droppedInternal=${droppedInternal} droppedZero=${droppedZero} normalized=${out.length}`,
  );
  if (typePairs.size > 0) {
    const pairs = Array.from(typePairs.entries())
      .map(([b, d]) => `${b} → ${d || "<empty>"}`)
      .join(" | ");
    console.log(`[bybit] type pairs (showBusiTypeEn → descriptionEn): ${pairs}`);
  }

  return out;
}
