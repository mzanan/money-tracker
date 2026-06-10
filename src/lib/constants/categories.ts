export const CATEGORIES = [
  "Food",
  "Coffee",
  "Groceries",
  "Transport",
  "Stay",
  "Flights",
  "Software",
  "Health",
  "Cash",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const UNCATEGORIZED_LABEL = "Uncategorized";
