import { isDynamicServerError } from "next/dist/client/components/hooks-server-context";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export type SessionResult =
  | { status: "ok"; user: SessionUser }
  | { status: "none" }
  | { status: "error" };

export const getSessionResult = cache(async (): Promise<SessionResult> => {
  let session;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    if (isDynamicServerError(error)) throw error;
    console.error("getSessionResult: auth.api.getSession failed", error);
    return { status: "error" };
  }
  if (!session?.user) return { status: "none" };
  return {
    status: "ok",
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
    },
  };
});

export async function getUser(): Promise<SessionUser | null> {
  const result = await getSessionResult();
  return result.status === "ok" ? result.user : null;
}

export const SESSION_EXPIRED_PATH = "/api/session/expired";

export async function requireUser(): Promise<SessionUser> {
  const result = await getSessionResult();
  if (result.status === "error") throw new Error("Session lookup failed");
  if (result.status === "none") redirect(SESSION_EXPIRED_PATH);
  return result.user;
}
