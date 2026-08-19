export const SHARE_ERROR_CODES = [
  "invalid",
  "type",
  "size",
  "byok_required",
  "key_decrypt_failed",
  "extract",
  "too_many_items",
] as const;

export type ShareErrorCode = (typeof SHARE_ERROR_CODES)[number];
