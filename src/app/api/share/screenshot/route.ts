import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { extractFromImage } from "@/lib/ai/screenshotExtract";
import { getUser } from "@/lib/session";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const COOKIE_NAME = "mt_share_payload";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(
      new URL("/screenshot-import?error=invalid", req.url),
    );
  }

  const file = form.get("image");
  if (!(file instanceof File) || !ALLOWED_MIME.includes(file.type)) {
    return NextResponse.redirect(
      new URL("/screenshot-import?error=type", req.url),
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.redirect(
      new URL("/screenshot-import?error=size", req.url),
    );
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.redirect(
      new URL("/screenshot-import?error=config", req.url),
    );
  }

  let payload;
  try {
    payload = await extractFromImage({
      data: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type,
    });
  } catch {
    return NextResponse.redirect(
      new URL("/screenshot-import?error=extract", req.url),
    );
  }

  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: JSON.stringify(payload),
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
