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
  let cursor = 0;
  for (const date of wanted) {
    while (cursor + 1 < ordered.length && ordered[cursor + 1].date <= date) {
      cursor += 1;
    }
    const rates: FxRates = {};
    for (const [code, value] of Object.entries(ordered[cursor].rates)) {
      if (currencies.has(code)) rates[code] = value;
    }
    result[date] = rates;
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
  for (const movement of movements) {
    dates.add(movement.occurredOn);
    for (const line of movement.lines) dates.add(line.occurredOn);
  }
  return dates;
}

export function valuationCurrencies(
  ...groups: ReadonlyArray<ReadonlyArray<string>>
): Set<string> {
  return new Set(groups.flat());
}
