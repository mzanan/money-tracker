const RELATIVE_TOLERANCE = Number.EPSILON * 4;
const ABSOLUTE_TOLERANCE = 1e-9;

export function toMinor(amount: number, scale: number): number {
  return Math.round(amount * 10 ** scale);
}

export function fromMinor(minor: number, scale: number): number {
  return minor / 10 ** scale;
}

export function isExactInMinor(amount: number, scale: number): boolean {
  const scaled = amount * 10 ** scale;
  const rounded = Math.round(scaled);
  if (rounded === 0) return false;
  const tolerance = Math.max(
    ABSOLUTE_TOLERANCE,
    Math.abs(scaled) * RELATIVE_TOLERANCE,
  );
  return Math.abs(scaled - rounded) <= tolerance;
}
