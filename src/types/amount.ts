export type AmountPrecision =
  | { currency: string; decimals?: never }
  | { decimals: number; currency?: never };
