import { NextResponse } from "next/server";

import { extractFromImage, type ExtractMode } from "@/lib/ai/screenshotExtract";
import { getUser } from "@/lib/session";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "vision_not_configured" },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "unsupported_type", type: file.type },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
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
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "extract_failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 502 },
    );
  }
}
