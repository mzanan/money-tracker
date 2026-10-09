import { storageDecimals } from "@/lib/constants/currencies";

const RELATIVE_TOLERANCE = Number.EPSILON * 4;
const ABSOLUTE_TOLERANCE = 1e-9;

function scaleOf(currency: string): number {
  return 10 ** storageDecimals(currency);
}

export function toMinor(amount: number, currency: string): number {
  return Math.round(amount * scaleOf(currency));
}

export function fromMinor(minor: number, currency: string): number {
  return minor / scaleOf(currency);
}

export function isExactInMinor(amount: number, currency: string): boolean {
  const scaled = amount * scaleOf(currency);
  const rounded = Math.round(scaled);
  if (rounded === 0) return false;
  const tolerance = Math.max(
    ABSOLUTE_TOLERANCE,
    Math.abs(scaled) * RELATIVE_TOLERANCE,
  );
  return Math.abs(scaled - rounded) <= tolerance;
}
