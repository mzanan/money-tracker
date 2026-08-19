import { NextResponse } from "next/server";

import { extractFromImage, type ExtractMode } from "@/lib/ai/screenshotExtract";
import {
  countryFromHeaders,
  logImageExtractError,
  logUsageEvent,
} from "@/lib/data/usageEvents";
import { getAssistantSettings } from "@/lib/data/userSettings";
import { decryptSecret } from "@/lib/integrations/crypto";
import { getUser } from "@/lib/session";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const country = countryFromHeaders(req.headers);
  const logError = (detail: string) =>
    logImageExtractError(user.id, country, detail);

  const settings = await getAssistantSettings(user.id);
  if (!settings?.ai_api_key || !settings.ai_provider) {
    await logError("byok_required");
    return NextResponse.json({ error: "byok_required" }, { status: 403 });
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(settings.ai_api_key, `${user.id}:ai`);
  } catch {
    await logError("key_decrypt_failed");
    return NextResponse.json(
      { error: "key_decrypt_failed" },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    await logError("invalid_form");
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    await logError("missing_image");
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    await logError(`unsupported_type:${file.type}`);
    return NextResponse.json(
      { error: "unsupported_type", type: file.type },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    await logError("too_large");
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const modeField = form.get("mode");
  const mode: ExtractMode = modeField === "receipt" ? "receipt" : "screenshot";

  try {
    const result = await extractFromImage(
      {
        data: buffer,
        mimeType: file.type,
      },
      mode,
      { provider: settings.ai_provider, apiKey },
    );
    await logUsageEvent({
      userId: user.id,
      event: "image_extract_success",
      detail: mode,
      country,
    });
    return NextResponse.json(result);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("[screenshot/extract] failed:", detail);
    await logError(`extract_failed:${detail}`);
    return NextResponse.json({ error: "extract_failed", detail }, { status: 502 });
  }
}
