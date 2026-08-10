import type { CsvRow } from "@/lib/actions/csvImport";
import {
  EXPENSE_DIRECTIONS,
  INCOME_DIRECTIONS,
  OK_STATUSES,
} from "@/lib/csv/constants";
import { parseAmount, parseDate, parseDateTime } from "@/lib/csv/parsing";
import type { CsvMapping } from "@/lib/csv/presets";

export type NormalizeResult =
  | { ok: true; row: CsvRow }
  | { ok: false; reason: string; cutoff?: boolean };

export function normalizeRowDetailed(
  raw: Record<string, string>,
  mapping: CsvMapping,
): NormalizeResult {
  if (mapping.statusCol) {
    const status = (raw[mapping.statusCol] ?? "").trim().toLowerCase();
    if (status && !OK_STATUSES.has(status)) {
      return { ok: false, reason: `status="${status}" (filtered)` };
    }
  }

  const occurredOn = parseDate(raw[mapping.dateCol], mapping.dateFormat);
  if (!occurredOn) {
    return {
      ok: false,
      reason: `unparseable date: "${raw[mapping.dateCol] ?? ""}" with format ${mapping.dateFormat}`,
    };
  }

  if (mapping.sinceDate && occurredOn < mapping.sinceDate) {
    return { ok: false, reason: `before ${mapping.sinceDate}`, cutoff: true };
  }

  const currency =
    mapping.currencyMode === "fixed"
      ? mapping.currencyFixed
      : (raw[mapping.currencyCol] ?? "").trim().toUpperCase();
  if (!currency) {
    return { ok: false, reason: "missing currency" };
  }

  const description = mapping.descriptionCol
    ? (raw[mapping.descriptionCol] ?? "").trim() || null
    : null;

  let kind: "income" | "expense";
  let amount: number;

  if (mapping.signConvention === "direction-column") {
    const dir = (raw[mapping.directionCol] ?? "").trim().toLowerCase();
    const parsed = parseAmount(raw[mapping.amountCol]);
    if (parsed === null || parsed === 0) {
      return {
        ok: false,
        reason: `empty/zero amount: "${raw[mapping.amountCol] ?? ""}"`,
      };
    }
    amount = Math.abs(parsed);
    if (INCOME_DIRECTIONS.has(dir)) kind = "income";
    else if (EXPENSE_DIRECTIONS.has(dir)) kind = "expense";
    else {
      return { ok: false, reason: `unrecognized direction: "${dir}"` };
    }
  } else if (mapping.signConvention === "debit-credit-cols") {
    const debit = parseAmount(raw[mapping.debitCol]);
    const credit = parseAmount(raw[mapping.creditCol]);
    if (debit && debit > 0) {
      kind = "expense";
      amount = Math.abs(debit);
    } else if (credit && credit > 0) {
      kind = "income";
      amount = Math.abs(credit);
    } else {
      return { ok: false, reason: "both debit and credit empty/zero" };
    }
  } else {
    const parsed = parseAmount(raw[mapping.amountCol]);
    if (parsed === null || parsed === 0) {
      return {
        ok: false,
        reason: `empty/zero amount: "${raw[mapping.amountCol] ?? ""}"`,
      };
    }
    amount = Math.abs(parsed);
    if (mapping.signConvention === "signed-amount") {
      kind = parsed < 0 ? "expense" : "income";
    } else if (mapping.signConvention === "all-expense") {
      kind = "expense";
    } else {
      kind = "income";
    }
  }

  const occurredAt = parseDateTime(raw[mapping.dateCol], occurredOn);

  const externalId = mapping.externalIdCol
    ? (raw[mapping.externalIdCol] ?? "").trim() || null
    : null;

  const feeAmount = mapping.feeCol
    ? (parseAmount(raw[mapping.feeCol]) ?? undefined)
    : undefined;

  return {
    ok: true,
    row: {
      kind,
      amount,
      currency,
      occurredOn,
      occurredAt,
      description,
      externalId,
      feeAmount,
    },
  };
}

export function normalizeRow(
  raw: Record<string, string>,
  mapping: CsvMapping,
): CsvRow | null {
  const result = normalizeRowDetailed(raw, mapping);
  return result.ok ? result.row : null;
}
