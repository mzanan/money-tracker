import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { extractFromImage } from "@/lib/ai/screenshotExtract";
import { getAssistantSettings } from "@/lib/data/userSettings";
import { decryptSecret } from "@/lib/integrations/crypto";
import type { ShareErrorCode } from "@/lib/screenshotShare";
import { getUser } from "@/lib/session";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const COOKIE_NAME = "mt_share_payload";
const MAX_COOKIE_VALUE_BYTES = 3800;

function redirectWithError(req: Request, code: ShareErrorCode) {
  return NextResponse.redirect(
    new URL(`/screenshot-import?error=${code}`, req.url),
  );
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return redirectWithError(req, "invalid");
  }

  const file = form.get("image");
  if (!(file instanceof File) || !ALLOWED_MIME.includes(file.type)) {
    return redirectWithError(req, "type");
  }
  if (file.size > MAX_BYTES) {
    return redirectWithError(req, "size");
  }

  const settings = await getAssistantSettings(user.id);
  if (!settings?.ai_api_key || !settings.ai_provider) {
    return redirectWithError(req, "byok_required");
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(settings.ai_api_key, `${user.id}:ai`);
  } catch {
    return redirectWithError(req, "key_decrypt_failed");
  }

  let payload;
  try {
    payload = await extractFromImage(
      {
        data: new Uint8Array(await file.arrayBuffer()),
        mimeType: file.type,
      },
      "screenshot",
      { provider: settings.ai_provider, apiKey },
    );
  } catch {
    return redirectWithError(req, "extract");
  }

  const serialized = JSON.stringify(payload);
  if (encodeURIComponent(serialized).length > MAX_COOKIE_VALUE_BYTES) {
    return redirectWithError(req, "too_many_items");
  }

  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: serialized,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(
    new URL("/screenshot-import?from=share", req.url),
  );
}

export const SHARE_COOKIE_NAME = COOKIE_NAME;
