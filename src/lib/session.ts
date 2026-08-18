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

export const getUser = cache(async (): Promise<SessionUser | null> => {
  let session;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    if (isDynamicServerError(error)) throw error;
    console.error("getUser: auth.api.getSession failed", error);
    return null;
  }
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
