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

interface DepositRow {
  coin: string;
  chain?: string;
  amount: string;
  txID?: string;
  status: number;
  successAt?: string;
}

interface InternalDepositRow {
  id: string;
  coin: string;
  amount: string;
  status: number;
  createdTime: string;
  txID?: string;
}

interface BybitResponse<T> {
  retCode: number;
  retMsg: string;
  result: { list?: T[]; rows?: T[]; nextPageCursor?: string };
}

const DEPOSIT_SUCCESS_STATUS = 3;
const INTERNAL_DEPOSIT_SUCCESS_STATUS = 2;

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

const DUPLICATE_OF_DEPOSIT_RECORD = new Set(["Deposit"]);

function isDuplicateOfDepositRecord(row: FundingHistoryRow): boolean {
  return DUPLICATE_OF_DEPOSIT_RECORD.has(row.showBusiTypeEn ?? "");
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

function msToOccurred(ms: string): { occurredOn: string; occurredAt: string } {
  const n = Number(ms);
  const date = Number.isFinite(n) && n > 0 ? new Date(n) : new Date();
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
    collected.push(...pageRows);

    cursor = data.result.nextPageCursor || undefined;
    pages += 1;
  } while (cursor && pages < MAX_PAGES_PER_WINDOW);

  return collected;
}

async function fetchPagedRows<T>(
  path: string,
  fromMs: number,
  toMs: number,
  creds: IntegrationCreds,
): Promise<T[]> {
  const collected: T[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const params: Record<string, string> = {
      startTime: Math.floor(fromMs).toString(),
      endTime: Math.floor(toMs).toString(),
      limit: "50",
    };
    if (cursor) params.cursor = cursor;

    const data = await get<T>(path, params, creds);
    const pageRows = data.result.rows ?? [];
    collected.push(...pageRows);

    cursor = data.result.nextPageCursor || undefined;
    pages += 1;
  } while (cursor && pages < MAX_PAGES_PER_WINDOW);

  return collected;
}

function depositToNormalized(row: DepositRow): NormalizedTx | null {
  if (row.status !== DEPOSIT_SUCCESS_STATUS) return null;
  const amount = Number(row.amount);
  if (!Number.isFinite(amount) || amount === 0) return null;
  const { occurredOn, occurredAt } = msToOccurred(row.successAt ?? "");
  return {
    externalId: `d:${row.coin}:${row.successAt ?? ""}:${row.txID ?? ""}:${row.amount}`,
    kind: "income",
    amount: Math.abs(amount),
    currency: row.coin,
    occurredOn,
    occurredAt,
    tags: [],
    note: "Bybit Deposit",
  };
}

function internalDepositToNormalized(row: InternalDepositRow): NormalizedTx | null {
  if (row.status !== INTERNAL_DEPOSIT_SUCCESS_STATUS) return null;
  const amount = Number(row.amount);
  if (!Number.isFinite(amount) || amount === 0) return null;
  const { occurredOn, occurredAt } = msToOccurred(row.createdTime);
  return {
    externalId: `di:${row.id}`,
    kind: "income",
    amount: Math.abs(amount),
    currency: row.coin,
    occurredOn,
    occurredAt,
    tags: [],
    note: "Bybit Transfer In",
  };
}

export async function fetchTransactions(
  creds: IntegrationCreds,
  since: Date,
): Promise<NormalizedTx[]> {
  const out: NormalizedTx[] = [];
  const windowMs = WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (let from = since.getTime(); from < now; from += windowMs) {
    const to = Math.min(from + windowMs, now);
    const rows = await fetchWindow(
      creds,
      Math.floor(from / 1000),
      Math.floor(to / 1000),
    );

    const onChain = await fetchPagedRows<DepositRow>(
      "/v5/asset/deposit/query-record",
      from,
      to,
      creds,
    );
    const internal = await fetchPagedRows<InternalDepositRow>(
      "/v5/asset/deposit/query-internal-record",
      from,
      to,
      creds,
    );
    for (const row of onChain) {
      const tx = depositToNormalized(row);
      if (tx) {
        out.push(tx);
      }
    }
    for (const row of internal) {
      const tx = internalDepositToNormalized(row);
      if (tx) {
        out.push(tx);
      }
    }

    for (const row of rows) {
      if (isInternalMove(row) || isDuplicateOfDepositRecord(row)) {
        continue;
      }
      const amount = Number(row.txnAmt);
      if (!Number.isFinite(amount) || amount === 0) {
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
        tags: [],
        note: describe(row),
      });
    }
  }

  return out;
}
