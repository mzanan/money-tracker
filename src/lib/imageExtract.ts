import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import { compressImage } from "@/lib/imageCompress";

export type ImageImportMode = "screenshot" | "receipt";

export type ImageExtractionResult =
  | { ok: true; items: DetectedTransaction[]; ignored: number }
  | { ok: false; error: string };

export async function requestImageExtraction(
  file: File,
  mode: ImageImportMode,
): Promise<ImageExtractionResult> {
  const form = new FormData();
  form.append("image", await compressImage(file));
  form.append("mode", mode);

  try {
    const response = await fetch("/api/screenshot/extract", {
      method: "POST",
      body: form,
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
  } catch {
    return { ok: false, error: "Network error while reading image" };
  }
}
