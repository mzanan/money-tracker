"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { getUser } from "@/lib/session";
import { newToken } from "@/lib/token";

import type { ActionResult } from "./transactions";

export async function generateIngestToken(): Promise<
  ActionResult<{ token: string }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const token = newToken();
  const updated = await db
    .update(user_settings)
    .set({ ingest_token: token })
    .where(eq(user_settings.user_id, user.id))
    .returning({ id: user_settings.user_id });
  if (!updated.length) return { ok: false, error: "Settings not found" };

  revalidatePath("/settings");
  return { ok: true, data: { token } };
}

export async function revokeIngestToken(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  await db
    .update(user_settings)
    .set({ ingest_token: null })
    .where(eq(user_settings.user_id, user.id));

  revalidatePath("/settings");
  return { ok: true };
}
