import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import { sourceForApp } from "@/lib/constants/sources";
import { compressImage } from "@/lib/imageCompress";

export type ImageImportMode = "screenshot" | "receipt";

export interface CandidateMatch {
  id: string;
  source: string;
  occurredOn: string;
  amount: number;
  currency: string;
  kind: "income" | "expense";
  note: string | null;
}

export interface EditableItem {
  id: string;
  selected: boolean;
  collapsed: boolean;
  kind: "income" | "expense";
  amount: string;
  currency: string;
  occurredOn: string | null;
  description: string;
  app: string | null;
  source: string;
  confidence: "high" | "medium" | "low";
  replaceId: string | null;
  error: string | null;
}

function sourceFor(app: string | null, existingSources: string[]): string {
  const source = sourceForApp(app);
  return existingSources.includes(source) ? source : "";
}

export function detectedToEditable(
  detected: DetectedTransaction,
  mode: ImageImportMode,
  existingSources: string[],
  collapsed: boolean,
): EditableItem {
  return {
    id: crypto.randomUUID(),
    selected: true,
    collapsed,
    kind: detected.kind,
    amount: detected.amount.toString(),
    currency: detected.currency.toUpperCase(),
    occurredOn: detected.occurredOn,
    description: detected.description ?? "",
    app: detected.app,
    source: mode === "receipt" ? "" : sourceFor(detected.app, existingSources),
    confidence: detected.confidence,
    replaceId: null,
    error: null,
  };
}

export type ImageExtractionResult =
  | { ok: true; items: DetectedTransaction[]; ignored: number }
  | { ok: false; error: string; aborted?: false }
  | { ok: false; aborted: true };

export async function requestImageExtraction(
  file: File,
  mode: ImageImportMode,
  signal?: AbortSignal,
): Promise<ImageExtractionResult> {
  const form = new FormData();
  form.append("image", await compressImage(file));
  form.append("mode", mode);

  try {
    const response = await fetch("/api/screenshot/extract", {
      method: "POST",
      body: form,
      signal,
    });
    const payload = (await response.json()) as
      | { items?: DetectedTransaction[]; ignored?: number }
      | { error: string };

    if (!response.ok) {
      return {
        ok: false,
        error:
          "error" in payload
            ? `Could not read: ${payload.error}`
            : "Could not read image",
      };
    }
    return {
      ok: true,
      items: "items" in payload ? (payload.items ?? []) : [],
      ignored: "ignored" in payload ? (payload.ignored ?? 0) : 0,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, aborted: true };
    }
    return { ok: false, error: "Network error while reading image" };
  }
}
