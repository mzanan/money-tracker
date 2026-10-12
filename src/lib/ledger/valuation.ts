import { monthEndsBetween } from "@/lib/dates";
import type { FxRates } from "@/types/db";
import type {
  Movement,
  MovementAmount,
  MovementLine,
  RatesByDate,
} from "@/types/ledger";

export interface DailyRatesRow {
  date: string;
  rates: FxRates;
}

export function ratesByDateFor(
  rows: ReadonlyArray<DailyRatesRow>,
  dates: Iterable<string>,
  currencies: ReadonlySet<string>,
): RatesByDate {
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const result: RatesByDate = {};
  if (ordered.length === 0) return result;
  const wanted = [...new Set(dates)].sort();
  const latest: FxRates = {};
  const absorb = (rates: FxRates) => {
    for (const [code, value] of Object.entries(rates)) {
      if (currencies.has(code) && value) latest[code] = value;
    }
  };
  absorb(ordered[0].rates);
  let cursor = 0;
  for (const date of wanted) {
    while (cursor + 1 < ordered.length && ordered[cursor + 1].date <= date) {
      cursor += 1;
      absorb(ordered[cursor].rates);
    }
    result[date] = { ...latest };
  }
  return result;
}

export function convertOn(
  amount: number,
  from: string,
  to: string,
  date: string,
  ratesByDate: RatesByDate,
): number | null {
  if (from === to) return amount;
  const rates = ratesByDate[date];
  const fromRate = rates?.[from];
  const toRate = rates?.[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}

export function convertAsOf(
  amount: number,
  from: string,
  to: string,
  asOf: string,
  ratesByDate: RatesByDate,
): number | null {
  if (from === to || ratesByDate[asOf]) {
    return convertOn(amount, from, to, asOf, ratesByDate);
  }
  const latest = Object.keys(ratesByDate)
    .filter((date) => date <= asOf)
    .sort()
    .pop();
  return latest ? convertOn(amount, from, to, latest, ratesByDate) : null;
}

export function lineValue(
  line: Pick<MovementLine, "amount" | "currency" | "occurredOn">,
  target: string,
  ratesByDate: RatesByDate,
): number | null {
  return convertOn(
    line.amount,
    line.currency,
    target,
    line.occurredOn,
    ratesByDate,
  );
}

export function amountInCurrency(
  amount: MovementAmount,
  target: string,
  ratesByDate: RatesByDate,
): number | null {
  if (amount.currency === target) return amount.amount;
  let total = 0;
  for (const line of amount.lines) {
    const value = lineValue(line, target, ratesByDate);
    if (value === null) return null;
    total += value;
  }
  return Math.abs(total);
}

export function movementSpend(
  movement: Movement,
  currency: string,
  ratesByDate: RatesByDate,
): number | null {
  let total = 0;
  for (const line of movement.lines) {
    if (line.kind !== "expense") continue;
    const value = lineValue(line, currency, ratesByDate);
    if (value === null) return null;
    total += value;
  }
  return total;
}

export function valuationDates(
  movements: ReadonlyArray<Movement>,
  today: string,
): Set<string> {
  const dates = new Set<string>([today]);
  let oldest = today;
  for (const movement of movements) {
    dates.add(movement.occurredOn);
    for (const line of movement.lines) {
      dates.add(line.occurredOn);
      if (line.occurredOn < oldest) oldest = line.occurredOn;
    }
  }
  for (const end of monthEndsBetween(oldest, today)) dates.add(end);
  return dates;
}

export function valuationCurrencies(
  ...groups: ReadonlyArray<ReadonlyArray<string>>
): Set<string> {
  return new Set(groups.flat());
}
