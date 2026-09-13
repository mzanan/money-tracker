export const EXTERNAL_ID_PREFIX = {
  csv: "csv:",
  screenshot: "ss:",
  transfer: "transfer:",
  exchange: "exchange:",
  withdrawal: "withdrawal:",
  reminder: "reminder:",
  transferFee: "transferfee:",
} as const;

export const TRANSFER_FEE_DEST_SUFFIX = ":dest";

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

export function isWithdrawalExternalId(id: string | null | undefined): boolean {
  return id != null && id.startsWith(EXTERNAL_ID_PREFIX.withdrawal);
}

export function isSingleLegWithdrawalExternalId(
  id: string | null | undefined,
): boolean {
  if (id == null || !isWithdrawalExternalId(id)) return false;
  return !id.slice(EXTERNAL_ID_PREFIX.withdrawal.length).includes(":");
}

export function withdrawalGroupFrom(
  externalId: string | null | undefined,
): string | null {
  if (externalId == null || !isWithdrawalExternalId(externalId)) return null;
  const rest = externalId.slice(EXTERNAL_ID_PREFIX.withdrawal.length);
  return rest.split(":")[0] || null;
}
