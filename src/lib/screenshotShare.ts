export const SHARE_ERROR_CODES = [
  "invalid",
  "type",
  "size",
  "config",
  "extract",
  "too_many_items",
] as const;

export type ShareErrorCode = (typeof SHARE_ERROR_CODES)[number];
