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

export function labelForSource(source: string): string {
  return (
    SOURCE_LABELS[source] ?? source.charAt(0).toUpperCase() + source.slice(1)
  );
}

export type AccountLabels = Record<string, string>;

export function resolveSourceLabel(
  source: string,
  accountLabels: AccountLabels,
): string {
  return accountLabels[source] ?? labelForSource(source);
}

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
const RESERVED_SOURCES = new Set(["all"]);

export function normalizeSource(raw: string): string | null {
  const source = raw.trim().toLowerCase();
  if (!SOURCE_RE.test(source) || RESERVED_SOURCES.has(source)) return null;
  return source;
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

