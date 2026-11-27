export const SHEET_ROW_STATUSES = [
  "imported",
  "already_imported",
  "duplicate",
  "excluded",
  "not_read",
] as const;

export type SheetRowStatus = (typeof SHEET_ROW_STATUSES)[number];

export const DUPLICATE_STEPS = [
  "external_id",
  "legacy_hash",
  "reread",
  "description",
  "ai",
] as const;

export type DuplicateStep = (typeof DUPLICATE_STEPS)[number];
