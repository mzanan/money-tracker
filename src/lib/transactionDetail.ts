import {
  resolveSourceLabel,
  type AccountLabels,
} from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import { formatDateShort } from "@/lib/dates";
import { isWithdrawalExternalId } from "@/lib/externalIds";
import {
  assetLines,
  crossCurrencyFlow,
  isPrincipalLine,
  isTransitLine,
  movementType,
} from "@/lib/ledger/movements";
import { rowBadgeKind, rowBadgeLabel } from "@/lib/transactionDisplay";
import type {
  Money,
  Movement,
  MovementLine,
  MovementType,
} from "@/types/ledger";

export type DetailDirection = "out" | "in" | "move";

export interface DetailRow {
  id: string;
  label: string;
  value: string;
  meta: string | null;
  isAmount: boolean;
}

export interface TransactionDetail {
  title: string;
  typeLabel: string;
  date: string;
  direction: DetailDirection;
  primary: string;
  secondary: string | null;
  incoming: boolean;
  breakdown: DetailRow[];
  result: DetailRow[];
  comment: string | null;
}

const TYPE_LABELS: Record<MovementType, string> = {
  expense: "Expense",
  income: "Income",
  transfer: rowBadgeLabel("transfer"),
  exchange: "Exchange",
  opening: rowBadgeLabel("opening"),
  unresolved: "Unresolved",
};

interface MoneyRow {
  id: string;
  label: string;
  money: Money;
  date: string;
}

interface OutGroup {
  key: string;
  currency: string;
  date: string;
  principal: number;
  fees: MovementLine[];
}

interface FeeSplit {
  outs: OutGroup[];
  inFees: MovementLine[];
  looseFees: MovementLine[];
}

type BreakdownRow = MoneyRow | { id: string; label: string; text: string };

function typeLabel(movement: Movement): string {
  const type = movementType(movement);
  const badge = rowBadgeKind({
    isOpening: type === "opening",
    isWithdrawal: movement.externalRefs.some((ref) =>
      isWithdrawalExternalId(ref.externalId),
    ),
    inTransit: movement.lines.some(isTransitLine),
    isTransfer: type === "transfer",
  });
  return badge ? rowBadgeLabel(badge) : TYPE_LABELS[type];
}

function direction(movement: Movement): DetailDirection {
  const type = movementType(movement);
  if (type === "income" || type === "opening") return "in";
  if (type === "expense") return "out";
  return "move";
}

function sameAccount(line: MovementLine, key: string, currency: string) {
  return line.key === key && line.currency === currency;
}

function principalIn(movement: Movement): MovementLine[] {
  return assetLines(movement).filter(
    (line) => line.amount > 0 && isPrincipalLine(line),
  );
}

function splitFees(movement: Movement): FeeSplit {
  const groups = new Map<string, OutGroup>();
  for (const line of assetLines(movement)) {
    if (line.amount >= 0 || !isPrincipalLine(line)) continue;
    const id = `${line.key}:${line.currency}`;
    const group = groups.get(id) ?? {
      key: line.key,
      currency: line.currency,
      date: line.occurredOn,
      principal: 0,
      fees: [],
    };
    group.principal += Math.abs(line.amount);
    groups.set(id, group);
  }
  const received = principalIn(movement);
  const inFees: MovementLine[] = [];
  const looseFees: MovementLine[] = [];
  for (const line of assetLines(movement)) {
    if (isPrincipalLine(line)) continue;
    const group = groups.get(`${line.key}:${line.currency}`);
    if (group) group.fees.push(line);
    else if (received.some((r) => sameAccount(r, line.key, line.currency))) {
      inFees.push(line);
    } else looseFees.push(line);
  }
  return { outs: [...groups.values()], inFees, looseFees };
}

function feeTotal(fees: ReadonlyArray<MovementLine>): number {
  return fees.reduce((sum, fee) => sum + Math.abs(fee.amount), 0);
}

function feeLabel(fee: MovementLine): string {
  return fee.role === "spread" ? "Spread" : "Fee";
}

function rateText(from: Money, to: Money): string | null {
  if (from.currency === to.currency || from.amount === 0 || to.amount === 0) {
    return null;
  }
  const forward = Math.abs(to.amount / from.amount);
  const [base, quote, rate] =
    forward >= 1
      ? [from.currency, to.currency, forward]
      : [to.currency, from.currency, 1 / forward];
  const digits = new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 6,
  }).format(rate);
  return `1 ${base} = ${digits} ${quote}`;
}

function resultRows(
  movement: Movement,
  labels: AccountLabels,
  split: FeeSplit,
): MoneyRow[] {
  const type = movementType(movement);
  const cross = crossCurrencyFlow(movement);
  const label = (key: string) => resolveSourceLabel(key, labels);
  const received = principalIn(movement).map((line) => ({
    id: line.id,
    label:
      type === "opening"
        ? `Opening balance in ${label(line.key)}`
        : `${label(line.key)} received`,
    money: {
      amount:
        line.amount -
        feeTotal(
          split.inFees.filter((fee) =>
            sameAccount(fee, line.key, line.currency),
          ),
        ),
      currency: line.currency,
    },
    date: line.occurredOn,
  }));
  const transit = movement.lines.filter(isTransitLine).map((line) => ({
    id: line.id,
    label: movement.transitDestination
      ? `In transit to ${label(movement.transitDestination)}`
      : "In transit",
    money: { amount: line.amount, currency: line.currency },
    date: line.occurredOn,
  }));
  const pending = movement.lines
    .filter((line) => line.kind === "pending")
    .map((line) => ({
      id: line.id,
      label: "Unknown account",
      money: { amount: Math.abs(line.amount), currency: line.currency },
      date: line.occurredOn,
    }));
  const spentOut = split.outs.find((group) => group.fees.length > 0);
  const spent =
    type !== "expense"
      ? []
      : cross
        ? [{ id: "spent", label: "Spent", money: cross.spent, date: "" }]
        : spentOut
          ? [
              {
                id: "spent",
                label: "Spent",
                money: {
                  amount: spentOut.principal,
                  currency: spentOut.currency,
                },
                date: spentOut.date,
              },
            ]
          : [];
  return [...spent, ...received, ...transit, ...pending];
}

function feeRows(
  fees: ReadonlyArray<MovementLine>,
  label: (fee: MovementLine) => string,
): MoneyRow[] {
  return fees.map((fee) => ({
    id: fee.id,
    label: label(fee),
    money: { amount: Math.abs(fee.amount), currency: fee.currency },
    date: fee.occurredOn,
  }));
}

function breakdownRows(
  movement: Movement,
  labels: AccountLabels,
  split: FeeSplit,
  rate: string | null,
): BreakdownRow[] {
  const type = movementType(movement);
  const verb = type === "expense" ? "Paid from" : "Sent from";
  const label = (key: string) => resolveSourceLabel(key, labels);
  const rows: BreakdownRow[] = [];
  for (const group of split.outs) {
    rows.push({
      id: `out:${group.key}:${group.currency}`,
      label: `${verb} ${label(group.key)}`,
      money: {
        amount: group.principal + feeTotal(group.fees),
        currency: group.currency,
      },
      date: group.date,
    });
    rows.push(...feeRows(group.fees, feeLabel));
    if (group.fees.length > 0 && rate) {
      rows.push({
        id: `converted:${group.key}`,
        label: "Converted",
        money: { amount: group.principal, currency: group.currency },
        date: group.date,
      });
    }
  }
  rows.push(
    ...feeRows(
      split.looseFees,
      (fee) => `${feeLabel(fee)} paid from ${label(fee.key)}`,
    ),
  );
  const cross = crossCurrencyFlow(movement);
  if (type === "income" && cross) {
    rows.push({ id: "earned", label: "Earned", money: cross.spent, date: "" });
  }
  if (rate) rows.push({ id: "rate", label: "Exchange rate", text: rate });
  rows.push(
    ...feeRows(split.inFees, (fee) =>
      split.outs.length > 0
        ? `${feeLabel(fee)} at ${label(fee.key)}`
        : feeLabel(fee),
    ),
  );
  return rows;
}

function principalRate(movement: Movement, split: FeeSplit): string | null {
  const out = split.outs[0];
  const sent = out ? { amount: out.principal, currency: out.currency } : null;
  const cross = crossCurrencyFlow(movement);
  if (cross) {
    const [gross] = principalIn(movement);
    const charged = sent ?? gross ?? cross.charged;
    return rateText(charged, cross.spent);
  }
  const received = principalIn(movement).find(
    (line) => line.currency !== sent?.currency,
  );
  return sent && received ? rateText(sent, received) : null;
}

function toDetailRow(
  row: BreakdownRow,
  movement: Movement,
  multiDate: boolean,
): DetailRow {
  if ("text" in row) {
    return {
      id: row.id,
      label: row.label,
      value: row.text,
      meta: null,
      isAmount: false,
    };
  }
  return {
    id: row.id,
    label: row.label,
    value: formatMoney(row.money.amount, row.money.currency),
    meta:
      multiDate && row.date && row.date !== movement.occurredOn
        ? formatDateShort(row.date)
        : null,
    isAmount: true,
  };
}

export function transactionDetail(
  movement: Movement,
  labels: AccountLabels,
): TransactionDetail {
  const multiDate =
    new Set(movement.lines.map((line) => line.occurredOn)).size > 1;
  const split = splitFees(movement);
  const rate = principalRate(movement, split);
  const result = resultRows(movement, labels, split);
  const breakdown = breakdownRows(movement, labels, split, rate);
  const firstMoneyRow = breakdown.find(
    (row): row is MoneyRow => "money" in row,
  );
  const primaryMoney = result[0]?.money ?? firstMoneyRow?.money ?? null;
  const firstOut = split.outs[0];
  const secondary =
    primaryMoney && firstOut && firstOut.currency !== primaryMoney.currency
      ? formatMoney(
          firstOut.principal + feeTotal(firstOut.fees),
          firstOut.currency,
        )
      : null;
  const kind = typeLabel(movement);
  const dir = direction(movement);
  return {
    title: movement.note?.trim() || kind,
    typeLabel: kind,
    date: formatDateShort(movement.occurredOn),
    direction: dir,
    primary: primaryMoney
      ? formatMoney(primaryMoney.amount, primaryMoney.currency)
      : "",
    secondary,
    incoming: dir === "in",
    breakdown: breakdown.map((row) => toDetailRow(row, movement, multiDate)),
    result: result.map((row) => toDetailRow(row, movement, multiDate)),
    comment: movement.comment?.trim() || null,
  };
}
