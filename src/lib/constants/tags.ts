export const SUGGESTED_TAGS = [
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

export type SuggestedTag = (typeof SUGGESTED_TAGS)[number];

export const UNTAGGED_LABEL = "Untagged";
