import {
  EXTERNAL_ID_PREFIX,
  transferFeeGroupFrom,
  withdrawalGroupFrom,
} from "@/lib/externalIds";
import {
  accountRefId,
  assetRef,
  bridgeRef,
  feesRef,
  pendingRef,
  uncategorizedRef,
  type AccountRef,
} from "@/lib/ledger/accounts";
import { isExactInMinor, toMinor } from "@/lib/ledger/amounts";
import { unbalancedCurrencies, type PostingLine } from "@/lib/ledger/posting";
import { dedupeTags } from "@/lib/tags";
import type { Transaction } from "@/types/db";

export interface ExternalRef {
  origin: string;
  externalId: string;
}

export interface PlannedTransaction {
  id: string;
  occurredOn: string;
  occurredAt: string;
  note: string | null;
  comment: string | null;
  tags: string[];
  recurringId: string | null;
  isFixed: boolean | null;
  budgetMonth: string | null;
  lines: PostingLine[];
  externalRefs: ExternalRef[];
}

export type MigrationReviewReason =
  | "unmatched_transfer_amounts"
  | "irregular_transfer_group"
  | "orphan_fee"
  | "precision_loss"
  | "unbalanced";

export interface MigrationReviewItem {
  reason: MigrationReviewReason;
  legacyTxIds: string[];
  detail: string;
}

export interface MigrationPlan {
  transactions: PlannedTransaction[];
  review: MigrationReviewItem[];
}

export interface BalanceMismatch {
  accountRefId: string;
  expected: number;
  actual: number;
}

const CSV_FEE_SUFFIX = ":fee";
const WITHDRAWAL_IN_SUFFIX = ":in";

export const BLOCKING_REVIEW_REASONS: ReadonlySet<MigrationReviewReason> =
  new Set(["precision_loss", "unbalanced"]);

type FeeTarget = { group: string } | { row: string } | null;

function signedMinor(row: Transaction): number {
  const minor = toMinor(row.amount_original, row.currency_original);
  return row.kind === "income" ? minor : -minor;
}

function assetLine(row: Transaction): PostingLine {
  return {
    account: assetRef(row.source, row.currency_original),
    amount: signedMinor(row),
    occurredOn: row.occurred_on,
    legacyTxId: row.id,
  };
}

function counterLine(row: Transaction, account: AccountRef): PostingLine {
  return {
    account,
    amount: -signedMinor(row),
    occurredOn: row.occurred_on,
    legacyTxId: row.id,
  };
}

function externalRefsOf(rows: ReadonlyArray<Transaction>): ExternalRef[] {
  return rows.flatMap((row) =>
    row.external_id
      ? [{ origin: row.source, externalId: row.external_id }]
      : [],
  );
}

function firstSet<T>(
  primary: Transaction,
  members: ReadonlyArray<Transaction>,
  pick: (row: Transaction) => T | null,
): T | null {
  const own = pick(primary);
  if (own !== null) return own;
  for (const row of members) {
    const value = pick(row);
    if (value !== null) return value;
  }
  return null;
}

function planFrom(
  primary: Transaction,
  members: ReadonlyArray<Transaction>,
  lines: PostingLine[],
): PlannedTransaction {
  return {
    id: primary.id,
    occurredOn: primary.occurred_on,
    occurredAt: primary.occurred_at,
    note: firstSet(primary, members, (row) => row.note),
    comment: firstSet(primary, members, (row) => row.comment),
    tags: dedupeTags(members.flatMap((row) => row.tags)),
    recurringId: firstSet(primary, members, (row) => row.recurring_id),
    isFixed: firstSet(primary, members, (row) => row.is_fixed),
    budgetMonth: firstSet(primary, members, (row) => row.budget_month),
    lines,
    externalRefs: externalRefsOf(members),
  };
}

function feeTargetOf(
  row: Transaction,
  csvRowIds: ReadonlyMap<string, string>,
): FeeTarget {
  const externalId = row.external_id;
  if (!externalId) return null;
  const group = transferFeeGroupFrom(externalId);
  if (group) return { group };
  if (externalId.startsWith(EXTERNAL_ID_PREFIX.manualFee)) {
    return { row: externalId.slice(EXTERNAL_ID_PREFIX.manualFee.length) };
  }
  if (externalId.endsWith(CSV_FEE_SUFFIX)) {
    const parentId = csvRowIds.get(
      `${row.source}|${externalId.slice(0, -CSV_FEE_SUFFIX.length)}`,
    );
    return parentId ? { row: parentId } : null;
  }
  return null;
}

function planGroup(
  legs: ReadonlyArray<Transaction>,
  review: MigrationReviewItem[],
): PlannedTransaction {
  const expenses = legs.filter((leg) => leg.kind === "expense");
  const incomes = legs.filter((leg) => leg.kind === "income");
  const legacyTxIds = legs.map((leg) => leg.id);

  if (expenses.length === 1 && incomes.length === 1) {
    const [sent] = expenses;
    const [received] = incomes;
    const lines = [assetLine(sent), assetLine(received)];
    if (sent.currency_original !== received.currency_original) {
      lines.push(
        counterLine(sent, bridgeRef(sent.currency_original)),
        counterLine(received, bridgeRef(received.currency_original)),
      );
    } else {
      const gap = -(lines[0].amount + lines[1].amount);
      if (gap !== 0) {
        lines.push({
          account: pendingRef(sent.currency_original),
          amount: gap,
          occurredOn: sent.occurred_on,
          legacyTxId: sent.id,
        });
        review.push({
          reason: "unmatched_transfer_amounts",
          legacyTxIds,
          detail: `${sent.amount_original} sent vs ${received.amount_original} received ${sent.currency_original}`,
        });
      }
    }
    return planFrom(sent, legs, lines);
  }

  review.push({
    reason: "irregular_transfer_group",
    legacyTxIds,
    detail: `${expenses.length} expense and ${incomes.length} income legs`,
  });
  const lines = legs.flatMap((leg) => [
    assetLine(leg),
    counterLine(leg, pendingRef(leg.currency_original)),
  ]);
  return planFrom(expenses[0] ?? legs[0], legs, lines);
}

export function planLedgerMigration(
  rows: ReadonlyArray<Transaction>,
): MigrationPlan {
  const review: MigrationReviewItem[] = [];
  const ordered = [...rows].sort(
    (a, b) =>
      a.occurred_at.localeCompare(b.occurred_at) || a.id.localeCompare(b.id),
  );
  const csvRowIds = new Map(
    ordered.flatMap((row) =>
      row.external_id ? [[`${row.source}|${row.external_id}`, row.id]] : [],
    ) as Array<[string, string]>,
  );

  const groups = new Map<string, Transaction[]>();
  const standalone: Transaction[] = [];
  const fees: Array<{ row: Transaction; target: FeeTarget }> = [];

  for (const row of ordered) {
    if (!isExactInMinor(row.amount_original, row.currency_original)) {
      review.push({
        reason: "precision_loss",
        legacyTxIds: [row.id],
        detail: `${row.amount_original} ${row.currency_original}`,
      });
    }
    if (row.transfer_group) {
      const legs = groups.get(row.transfer_group) ?? [];
      legs.push(row);
      groups.set(row.transfer_group, legs);
      continue;
    }
    const target = feeTargetOf(row, csvRowIds);
    if (target) {
      fees.push({ row, target });
      continue;
    }
    standalone.push(row);
  }

  const planned: PlannedTransaction[] = [];
  const byGroup = new Map<string, PlannedTransaction>();
  const byRow = new Map<string, PlannedTransaction>();

  for (const [group, legs] of groups) {
    const plan = planGroup(legs, review);
    planned.push(plan);
    byGroup.set(group, plan);
    for (const leg of legs) byRow.set(leg.id, plan);
  }

  for (const row of standalone) {
    const plan = planFrom(
      row,
      [row],
      [
        assetLine(row),
        counterLine(row, uncategorizedRef(row.kind, row.currency_original)),
      ],
    );
    planned.push(plan);
    byRow.set(row.id, plan);
    const withdrawalGroup = withdrawalGroupFrom(row.external_id);
    const isBankSide =
      row.kind === "expense" &&
      !row.external_id?.endsWith(WITHDRAWAL_IN_SUFFIX);
    if (withdrawalGroup && isBankSide && !byGroup.has(withdrawalGroup)) {
      byGroup.set(withdrawalGroup, plan);
    }
  }

  for (const { row, target } of fees) {
    const lines = [
      assetLine(row),
      counterLine(row, feesRef(row.currency_original)),
    ];
    const anchor =
      target && "group" in target
        ? byGroup.get(target.group)
        : target
          ? byRow.get(target.row)
          : undefined;
    if (anchor) {
      anchor.lines.push(...lines);
      anchor.externalRefs.push(...externalRefsOf([row]));
      continue;
    }
    review.push({
      reason: "orphan_fee",
      legacyTxIds: [row.id],
      detail: row.external_id ?? "",
    });
    planned.push(planFrom(row, [row], lines));
  }

  for (const plan of planned) {
    const unbalanced = unbalancedCurrencies(plan.lines);
    if (unbalanced.length > 0) {
      review.push({
        reason: "unbalanced",
        legacyTxIds: [plan.id],
        detail: unbalanced.join(", "),
      });
    }
  }

  planned.sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
  );
  return { transactions: planned, review };
}

export function legacyAssetBalances(
  rows: ReadonlyArray<Transaction>,
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const row of rows) {
    const id = accountRefId(assetRef(row.source, row.currency_original));
    balances.set(id, (balances.get(id) ?? 0) + signedMinor(row));
  }
  return balances;
}

export function plannedAssetBalances(plan: MigrationPlan): Map<string, number> {
  const balances = new Map<string, number>();
  for (const transaction of plan.transactions) {
    for (const line of transaction.lines) {
      if (line.account.kind !== "asset") continue;
      const id = accountRefId(line.account);
      balances.set(id, (balances.get(id) ?? 0) + line.amount);
    }
  }
  return balances;
}

export function balanceMismatches(
  expected: ReadonlyMap<string, number>,
  actual: ReadonlyMap<string, number>,
): BalanceMismatch[] {
  const ids = new Set([...expected.keys(), ...actual.keys()]);
  return [...ids]
    .map((id) => ({
      accountRefId: id,
      expected: expected.get(id) ?? 0,
      actual: actual.get(id) ?? 0,
    }))
    .filter((row) => row.expected !== row.actual);
}
