import { LEDGER_KEYS } from "@/lib/ledger/accounts";
import { fromMinor } from "@/lib/ledger/amounts";
import type { ScaleOf } from "@/lib/ledger/scale";
import type {
  Movement,
  MovementExternalRef,
  MovementLine,
  MovementType,
  SimpleFlow,
} from "@/types/ledger";
import type { LedgerAccount, LedgerEntry, LedgerTransaction } from "@/types/db";

export interface MovementSourceRows {
  transactions: ReadonlyArray<LedgerTransaction>;
  entries: ReadonlyArray<LedgerEntry>;
  accounts: ReadonlyArray<LedgerAccount>;
  externalIds: ReadonlyArray<{
    transaction_id: string;
    origin: string;
    external_id: string;
  }>;
}

function newestFirst(a: Movement, b: Movement): number {
  return (
    b.occurredOn.localeCompare(a.occurredOn) ||
    b.occurredAt.localeCompare(a.occurredAt) ||
    b.id.localeCompare(a.id)
  );
}

export function buildMovements(
  rows: MovementSourceRows,
  scaleOf: ScaleOf,
): Movement[] {
  const accountsById = new Map(rows.accounts.map((a) => [a.id, a]));
  const linesByTx = new Map<string, MovementLine[]>();
  for (const entry of rows.entries) {
    const account = accountsById.get(entry.account_id);
    if (!account) continue;
    const lines = linesByTx.get(entry.transaction_id) ?? [];
    lines.push({
      id: entry.id,
      accountId: account.id,
      kind: account.kind,
      key: account.key,
      currency: account.currency,
      amount: fromMinor(entry.amount, scaleOf(account.currency)),
      role: entry.role,
      occurredOn: entry.occurred_on,
      legacyTxId: entry.legacy_tx_id,
    });
    linesByTx.set(entry.transaction_id, lines);
  }
  const refsByTx = new Map<string, MovementExternalRef[]>();
  for (const ref of rows.externalIds) {
    const refs = refsByTx.get(ref.transaction_id) ?? [];
    refs.push({ origin: ref.origin, externalId: ref.external_id });
    refsByTx.set(ref.transaction_id, refs);
  }
  return rows.transactions
    .filter((tx) => tx.voided_at === null)
    .map((tx) => ({
      id: tx.id,
      occurredOn: tx.occurred_on,
      occurredAt: tx.occurred_at,
      budgetMonth: tx.budget_month,
      note: tx.note,
      comment: tx.comment,
      tags: tx.tags,
      recurringId: tx.recurring_id,
      isFixed: tx.is_fixed,
      externalRefs: refsByTx.get(tx.id) ?? [],
      lines: linesByTx.get(tx.id) ?? [],
      leg: null,
    }))
    .flatMap(splitLegsByDate)
    .sort(newestFirst);
}

export function splitLegsByDate(movement: Movement): Movement[] {
  const dates = [
    ...new Set(assetLines(movement).map((line) => line.occurredOn)),
  ].sort();
  if (dates.length < 2 || !isOwnMovement(movement)) return [movement];
  const type = movementType(movement);
  const ends = transferEnds(movement);
  const [first] = dates;
  return dates.map((date) => {
    const lines = movement.lines.filter((line) =>
      dates.includes(line.occurredOn)
        ? line.occurredOn === date
        : date === first,
    );
    const net = lines
      .filter((line) => line.kind === "asset")
      .reduce((sum, line) => sum + line.amount, 0);
    return {
      ...movement,
      id: `${movement.id}:${date}`,
      occurredOn: date,
      lines,
      leg: {
        movementId: movement.id,
        type,
        ends,
        direction: net < 0 ? "sent" : "received",
      },
    };
  });
}

export function isFeeLine(line: MovementLine): boolean {
  return line.kind === "expense" && line.key === LEDGER_KEYS.fees;
}

export function assetLines(
  movement: Movement,
  source?: string,
): MovementLine[] {
  return movement.lines.filter(
    (line) =>
      line.kind === "asset" && (source === undefined || line.key === source),
  );
}

export function sourcesOf(movement: Movement): string[] {
  return [...new Set(assetLines(movement).map((line) => line.key))];
}

export function touchesSource(movement: Movement, source: string): boolean {
  return movement.lines.some(
    (line) => line.kind === "asset" && line.key === source,
  );
}

export function movementType(movement: Movement): MovementType {
  if (movement.leg) return movement.leg.type;
  const lines = movement.lines;
  if (lines.some((line) => line.kind === "pending")) return "unresolved";
  if (lines.some((line) => line.kind === "expense" && !isFeeLine(line))) {
    return "expense";
  }
  if (lines.some((line) => line.kind === "income")) return "income";
  if (lines.some((line) => line.kind === "bridge")) {
    return sourcesOf(movement).length > 1 ? "transfer" : "exchange";
  }
  if (sourcesOf(movement).length > 1) return "transfer";
  return lines.some(isFeeLine) ? "expense" : "transfer";
}

export function isOwnMovement(movement: Movement): boolean {
  const type = movementType(movement);
  return type === "transfer" || type === "exchange";
}

export function primaryAssetLine(movement: Movement): MovementLine | null {
  const assets = assetLines(movement);
  return (
    assets.find((line) => line.amount < 0 && isPrincipalLine(line)) ??
    assets.find(isPrincipalLine) ??
    assets[0] ??
    null
  );
}

export function isPrincipalLine(line: MovementLine): boolean {
  return line.role === "amount" || line.role === "withdrawal";
}

export function principalAssetLines(movement: Movement): MovementLine[] {
  return assetLines(movement).filter(isPrincipalLine);
}

export function exchangeSides(
  movement: Movement,
): { sent: MovementLine; received: MovementLine } | null {
  if (movementType(movement) !== "exchange") return null;
  const lines = principalAssetLines(movement);
  const sent = lines.find((line) => line.amount < 0);
  const received = lines.find((line) => line.amount > 0);
  return sent && received ? { sent, received } : null;
}

export function simpleFlow(movement: Movement): SimpleFlow | null {
  const type = movementType(movement);
  if (type !== "income" && type !== "expense") return null;
  const assets = principalAssetLines(movement);
  if (assets.length !== 1) return null;
  const [line] = assets;
  return {
    kind: type,
    source: line.key,
    currency: line.currency,
    amount: Math.abs(line.amount),
  };
}

export function transferEnds(
  movement: Movement,
): { from: string; to: string } | null {
  if (movement.leg) return movement.leg.ends;
  if (!isOwnMovement(movement)) return null;
  const assets = assetLines(movement);
  const from = assets.find((line) => line.amount < 0);
  const to = assets.find((line) => line.amount > 0 && line.key !== from?.key);
  if (!from || !to) return null;
  return { from: from.key, to: to.key };
}
