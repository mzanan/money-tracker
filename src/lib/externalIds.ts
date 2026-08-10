export const EXTERNAL_ID_PREFIX = {
  csv: "csv:",
  screenshot: "ss:",
  transfer: "transfer:",
  exchange: "exchange:",
  withdrawal: "withdrawal:",
  reminder: "reminder:",
  transferFee: "transferfee:",
} as const;

export function isCsvExternalId(id: string | null | undefined): boolean {
  return (
    id != null &&
    (id.startsWith(EXTERNAL_ID_PREFIX.csv) ||
      !id.includes(":") ||
      id.endsWith(":fee"))
  );
}

export function isSyncedExternalId(id: string | null | undefined): boolean {
  if (id == null || !id.includes(":") || id.endsWith(":fee")) return false;
  return !Object.values(EXTERNAL_ID_PREFIX).some((prefix) =>
    id.startsWith(prefix),
  );
}
