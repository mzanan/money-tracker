import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";

const RETRY_COOKIE = "mt_session_retry";
const RETRY_WINDOW_SECONDS = 60;

export async function GET(request: NextRequest) {
  const home = new URL("/", request.url);
  let sessionMayBeValid = true;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    sessionMayBeValid = session !== null;
  } catch (error) {
    console.error("session/expired: auth.api.getSession failed", error);
  }

  const alreadyRetried = request.cookies.has(RETRY_COOKIE);
  if (sessionMayBeValid && !alreadyRetried) {
    const retry = NextResponse.redirect(home);
    retry.cookies.set(RETRY_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: RETRY_WINDOW_SECONDS,
    });
    return retry;
  }

  const signOut = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  const response = NextResponse.redirect(home);
  response.cookies.delete(RETRY_COOKIE);
  for (const cookie of signOut.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
