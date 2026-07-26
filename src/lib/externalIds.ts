export const EXTERNAL_ID_PREFIX = {
  csv: "csv:",
  screenshot: "ss:",
  transfer: "transfer:",
  exchange: "exchange:",
  withdrawal: "withdrawal:",
  reminder: "reminder:",
} as const;

export function isCsvExternalId(id: string | null | undefined): boolean {
  return (
    id != null && (id.startsWith(EXTERNAL_ID_PREFIX.csv) || !id.includes(":"))
  );
}

export function isSyncedExternalId(id: string | null | undefined): boolean {
  if (id == null || !id.includes(":")) return false;
  return !Object.values(EXTERNAL_ID_PREFIX).some((prefix) =>
    id.startsWith(prefix),
  );
}
