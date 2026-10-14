import { ALL_SOURCES } from "@/lib/constants/sources";
import { effectiveYearMonth } from "@/lib/dates";
import {
  assetLines,
  isOwnMovement,
  movementType,
  pendingTransfer,
  primaryAssetLine,
  touchesSource,
} from "@/lib/ledger/movements";
import { convertAsOf, lineValue } from "@/lib/ledger/valuation";
import type {
  FlowKind,
  Movement,
  MovementAmount,
  MovementLine,
  RatesByDate,
} from "@/types/ledger";

export type MovementScope = string;

export interface ValuationContext {
  scope: MovementScope;
  currency: string;
  ratesByDate: RatesByDate;
}

export interface TotalsBreakdown {
  income: number;
  expense: number;
  net: number;
}

export function isAllScope(scope: MovementScope): boolean {
  return scope === ALL_SOURCES;
}

export function scopedMovements(
  movements: ReadonlyArray<Movement>,
  scope: MovementScope,
): Movement[] {
  return isAllScope(scope)
    ? [...movements]
    : movements.filter((movement) => touchesSource(movement, scope));
}

export function countedLines(
  movement: Movement,
  scope: MovementScope,
): MovementLine[] {
  if (!isAllScope(scope)) return assetLines(movement, scope);
  return movement.lines.filter(
    (line) => line.kind === "expense" || line.kind === "income",
  );
}

export function scopedDate(movement: Movement, scope: MovementScope): string {
  if (isAllScope(scope)) return movement.occurredOn;
  const dates = assetLines(movement, scope).map((line) => line.occurredOn);
  return dates.length === 0 ? movement.occurredOn : dates.sort()[0];
}

function flowValue(
  line: MovementLine,
  scope: MovementScope,
): { kind: "income" | "expense"; amount: number } {
  if (!isAllScope(scope)) {
    return line.amount >= 0
      ? { kind: "income", amount: line.amount }
      : { kind: "expense", amount: -line.amount };
  }
  return line.kind === "income"
    ? { kind: "income", amount: -line.amount }
    : { kind: "expense", amount: line.amount };
}

export function periodTotals(
  movements: ReadonlyArray<Movement>,
  scope: MovementScope,
  displayCurrency: string,
  ratesByDate: RatesByDate,
): TotalsBreakdown {
  let income = 0;
  let expense = 0;
  for (const movement of movements) {
    for (const line of countedLines(movement, scope)) {
      const flow = flowValue(line, scope);
      const value = lineValue(
        { ...line, amount: flow.amount },
        displayCurrency,
        ratesByDate,
      );
      if (value === null) continue;
      if (flow.kind === "income") income += value;
      else expense += value;
    }
  }
  return { income, expense, net: income - expense };
}

export function scopeBalance(
  movements: ReadonlyArray<Movement>,
  scope: MovementScope,
  displayCurrency: string,
  ratesByDate: RatesByDate,
  asOf: string,
): number {
  const source = isAllScope(scope) ? undefined : scope;
  const native = new Map<string, number>();
  for (const movement of movements) {
    for (const line of assetLines(movement, source)) {
      native.set(line.currency, (native.get(line.currency) ?? 0) + line.amount);
    }
  }
  let total = 0;
  for (const [currency, amount] of native) {
    total +=
      convertAsOf(amount, currency, displayCurrency, asOf, ratesByDate) ?? 0;
  }
  return total;
}

export function soleScopeCurrency(
  movements: ReadonlyArray<Movement>,
  scope: MovementScope,
): string | null {
  let found: string | null = null;
  for (const movement of movements) {
    for (const line of countedLines(movement, scope)) {
      if (found === null) found = line.currency;
      else if (found !== line.currency) return null;
    }
  }
  return found;
}

function singleCurrency(lines: ReadonlyArray<MovementLine>): string | null {
  const currencies = new Set(lines.map((line) => line.currency));
  return currencies.size === 1 ? [...currencies][0] : null;
}

function amountOf(
  kind: FlowKind,
  lines: MovementLine[],
  sign: 1 | -1,
  fallbackCurrency: string,
  ratesByDate: RatesByDate,
): MovementAmount {
  const currency = singleCurrency(lines);
  if (currency !== null) {
    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    return { kind, amount: Math.abs(total * sign), currency, lines };
  }
  const total = lines.reduce(
    (sum, line) => sum + (lineValue(line, fallbackCurrency, ratesByDate) ?? 0),
    0,
  );
  return {
    kind,
    amount: Math.abs(total * sign),
    currency: fallbackCurrency,
    lines,
  };
}

export function movementAmount(
  movement: Movement,
  scope: MovementScope,
  baseCurrency: string,
  ratesByDate: RatesByDate,
): MovementAmount {
  if (!isAllScope(scope)) {
    const amount = amountOf(
      "income",
      assetLines(movement, scope),
      1,
      baseCurrency,
      ratesByDate,
    );
    const net = amount.lines.reduce(
      (sum, line) =>
        sum +
        (amount.currency === line.currency
          ? line.amount
          : (lineValue(line, baseCurrency, ratesByDate) ?? 0)),
      0,
    );
    return { ...amount, kind: net >= 0 ? "income" : "expense" };
  }
  const type = movementType(movement);
  if (type === "expense") {
    const lines = movement.lines.filter((line) => line.kind === "expense");
    return amountOf("expense", lines, 1, baseCurrency, ratesByDate);
  }
  if (type === "income") {
    const lines = movement.lines.filter((line) => line.kind === "income");
    return amountOf("income", lines, -1, baseCurrency, ratesByDate);
  }
  const primary = primaryAssetLine(movement);
  const lines = primary ? [primary] : [];
  return amountOf(
    isOwnMovement(movement) ? "transfer" : "expense",
    lines,
    1,
    baseCurrency,
    ratesByDate,
  );
}

export function linesInMonth(
  movements: ReadonlyArray<Movement>,
  yearMonth: string,
): Movement[] {
  return movements.flatMap((movement) => {
    const lines = movement.lines.filter(
      (line) => line.occurredOn.slice(0, 7) === yearMonth,
    );
    return lines.length === 0 ? [] : [{ ...movement, lines }];
  });
}

export function scopedYearMonth(
  movement: Movement,
  scope: MovementScope,
): string {
  return scopedDate(movement, scope).slice(0, 7);
}

export function scopedMonth(movement: Movement, scope: MovementScope): string {
  return effectiveYearMonth({
    occurredOn: scopedDate(movement, scope),
    budgetMonth: movement.budgetMonth,
  });
}

export function onScopedDate(scope: MovementScope, date: string) {
  return (movement: Movement): boolean => scopedDate(movement, scope) === date;
}

export function monthMovements(
  movements: ReadonlyArray<Movement>,
  scope: MovementScope,
  yearMonth: string,
): Movement[] {
  return movements
    .filter((movement) => scopedMonth(movement, scope) === yearMonth)
    .sort(byScopedDateDesc(scope));
}

export function byScopedDateDesc(scope: MovementScope) {
  return (a: Movement, b: Movement): number =>
    scopedDate(b, scope).localeCompare(scopedDate(a, scope)) ||
    b.occurredAt.localeCompare(a.occurredAt);
}

export function pendingIncoming(
  movements: ReadonlyArray<Movement>,
  scope: MovementScope,
  displayCurrency: string,
  ratesByDate: RatesByDate,
  asOf: string,
): number {
  const native = new Map<string, number>();
  for (const movement of movements) {
    const pending = pendingTransfer(movement);
    if (!pending || (!isAllScope(scope) && pending.to !== scope)) continue;
    native.set(
      pending.currency,
      (native.get(pending.currency) ?? 0) + pending.amount,
    );
  }
  let total = 0;
  for (const [currency, amount] of native) {
    total +=
      convertAsOf(amount, currency, displayCurrency, asOf, ratesByDate) ?? 0;
  }
  return total;
}
