import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
