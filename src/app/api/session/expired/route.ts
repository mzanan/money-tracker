import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";

const RETRY_COOKIE = "mt_session_retry";
const RETRY_WINDOW_SECONDS = 60;

type SessionCheck = "none" | "valid" | "error";

async function checkSession(request: NextRequest): Promise<SessionCheck> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return session ? "valid" : "none";
  } catch (error) {
    console.error("session/expired: auth.api.getSession failed", error);
    return "error";
  }
}

export async function GET(request: NextRequest) {
  const home = new URL("/", request.url);
  const check = await checkSession(request);

  if (check === "none") {
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

  if (request.cookies.has(RETRY_COOKIE)) {
    const failed = new NextResponse(
      "We could not verify your session. Reload the page to try again.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
    failed.cookies.delete(RETRY_COOKIE);
    return failed;
  }

  const retry = NextResponse.redirect(home);
  retry.cookies.set(RETRY_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: RETRY_WINDOW_SECONDS,
  });
  return retry;
}
