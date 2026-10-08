import type { IntegrationProvider } from "@/types/db";

export type SourceKind = "manual" | "api" | "csv";

export const SOURCE_LABELS: Record<string, string> = {
  manual: "Cash",
  bybit: "Bybit",
  wise: "Wise",
  astropay: "Astropay",
};

export const API_SOURCES: ReadonlySet<string> = new Set<IntegrationProvider>([
  "bybit",
]);

export function capitalizeLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function labelForSource(source: string): string {
  return SOURCE_LABELS[source] ?? capitalizeLabel(source);
}

export type AccountLabels = Record<string, string>;

export function resolveSourceLabel(
  source: string,
  accountLabels: AccountLabels,
): string {
  return accountLabels[source] ?? labelForSource(source);
}

export function tabSourcesFrom(
  sources: ReadonlyArray<string>,
  cashEnabled: boolean,
): string[] {
  return cashEnabled && !sources.includes("manual")
    ? ["manual", ...sources]
    : [...sources];
}

export function withoutArchived(
  sources: ReadonlyArray<string>,
  archived: ReadonlyArray<string>,
): string[] {
  return sources.filter((source) => !archived.includes(source));
}

export function addableSources(
  sources: ReadonlyArray<string>,
  cashEnabled: boolean,
  archived: ReadonlyArray<string>,
): string[] {
  return withoutArchived(tabSourcesFrom(sources, cashEnabled), archived).filter(
    (source) => kindOfSource(source) !== "api",
  );
}

export function cashWithdrawalSources(
  sources: ReadonlyArray<string>,
): string[] {
  return sources.filter(
    (source) => source !== "manual" && kindOfSource(source) !== "api",
  );
}

export function defaultAddSource(
  selected: string,
  addable: ReadonlyArray<string>,
): string | null {
  if (addable.includes(selected)) return selected;
  return addable[0] ?? null;
}

export type SyncStatus = "not-connected" | "paused" | "failed" | "synced";

export function syncStatus({
  connected,
  autoSync,
  archived,
  lastError,
}: {
  connected: boolean;
  autoSync: boolean;
  archived: boolean;
  lastError: string | null;
}): SyncStatus {
  if (!connected) return "not-connected";
  if (archived || !autoSync) return "paused";
  if (lastError) return "failed";
  return "synced";
}

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  "not-connected": "Not connected",
  paused: "Paused",
  failed: "Sync failed",
  synced: "Synced",
};

export type SyncStatusTone = "secondary" | "outline" | "destructive";

export const SYNC_STATUS_TONES: Record<
  SyncStatus,
  { variant: SyncStatusTone; className?: string }
> = {
  "not-connected": { variant: "outline" },
  paused: { variant: "outline" },
  failed: { variant: "destructive" },
  synced: { variant: "secondary", className: "text-income" },
};

export function kindOfSource(source: string): SourceKind {
  if (source === "manual") return "manual";
  if (API_SOURCES.has(source)) return "api";
  return "csv";
}

export function sourceForApp(app?: string | null): string {
  const a = (app ?? "").toLowerCase();
  if (a.includes("wise")) return "wise";
  if (a.includes("bybit")) return "bybit";
  if (
    a.includes("wallet") ||
    a.includes("gpay") ||
    a.includes("google pay") ||
    a.includes("nfc")
  ) {
    return "google wallet";
  }
  return "notification";
}

const SOURCE_RE = /^[a-z0-9][a-z0-9 &_-]{0,31}$/;
export const ALL_SOURCES = "all";

const RESERVED_SOURCES = new Set([ALL_SOURCES]);

export const SOURCE_NAME_HINT =
  "Use up to 32 letters, numbers, spaces, &, _ or -";

export function normalizeSource(raw: string): string | null {
  const source = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
  if (!SOURCE_RE.test(source) || RESERVED_SOURCES.has(source)) return null;
  return source;
}

export function isAccountNameTaken(
  name: string,
  source: string,
  existingSources: ReadonlyArray<string>,
  accountLabels: AccountLabels,
): boolean {
  const wanted = name.trim().toLowerCase();
  return existingSources.some(
    (existing) =>
      existing === source ||
      resolveSourceLabel(existing, accountLabels).toLowerCase() === wanted,
  );
}

export function transferAvailableFor(
  source: string,
  cashEnabled: boolean,
): boolean {
  if (!source || source === "all") return false;
  if (kindOfSource(source) === "api") return false;
  if (source === "manual") return cashEnabled;
  return true;
}

export function withdrawalAvailableFor(source: string): boolean {
  return Boolean(source) && kindOfSource(source) === "csv";
}
