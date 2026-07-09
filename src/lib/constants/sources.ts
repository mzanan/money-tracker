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
