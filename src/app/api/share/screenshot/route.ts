import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { extractFromImage } from "@/lib/ai/screenshotExtract";
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

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return redirectWithError(req, "config");
  }

  let payload;
  try {
    payload = await extractFromImage({
      data: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type,
    });
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
