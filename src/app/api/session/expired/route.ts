import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  let session;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.error("session/expired: auth.api.getSession failed", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  if (session) return response;

  const signOut = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  for (const cookie of signOut.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
