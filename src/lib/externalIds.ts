export const EXTERNAL_ID_PREFIX = {
  csv: "csv:",
  screenshot: "ss:",
  transfer: "transfer:",
  exchange: "exchange:",
  withdrawal: "withdrawal:",
  reminder: "reminder:",
  transferFee: "transferfee:",
  manualFee: "manualfee:",
} as const;

export function manualFeeExternalId(parentId: string): string {
  return `${EXTERNAL_ID_PREFIX.manualFee}${parentId}`;
}

export const TRANSFER_FEE_DEST_SUFFIX = ":dest";

export function transferFeeExternalId(
  group: string,
  side: "origin" | "destination" = "origin",
): string {
  const suffix = side === "destination" ? TRANSFER_FEE_DEST_SUFFIX : "";
  return `${EXTERNAL_ID_PREFIX.transferFee}${group}${suffix}`;
}

export function transferFeeGroupFrom(
  externalId: string | null | undefined,
): string | null {
  if (!externalId?.startsWith(EXTERNAL_ID_PREFIX.transferFee)) return null;
  const rest = externalId.slice(EXTERNAL_ID_PREFIX.transferFee.length);
  return rest.split(":")[0] || null;
}

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

const NON_ENTRY_PREFIXES = [
  EXTERNAL_ID_PREFIX.transfer,
  EXTERNAL_ID_PREFIX.exchange,
  EXTERNAL_ID_PREFIX.withdrawal,
  EXTERNAL_ID_PREFIX.transferFee,
  EXTERNAL_ID_PREFIX.manualFee,
];

export function isManualEntryExternalId(
  id: string | null | undefined,
): boolean {
  if (id == null) return true;
  if (isCsvExternalId(id) || isSyncedExternalId(id)) return false;
  return !NON_ENTRY_PREFIXES.some((prefix) => id.startsWith(prefix));
}
