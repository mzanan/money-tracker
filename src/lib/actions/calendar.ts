"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { getUser } from "@/lib/session";

import type { ActionResult } from "./transactions";

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function generateCalendarToken(): Promise<
  ActionResult<{ token: string }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const token = newToken();
  const updated = await db
    .update(user_settings)
    .set({ calendar_token: token })
    .where(eq(user_settings.user_id, user.id))
    .returning({ id: user_settings.user_id });
  if (!updated.length) return { ok: false, error: "Settings not found" };

  revalidatePath("/settings");
  return { ok: true, data: { token } };
}

export async function revokeCalendarToken(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  await db
    .update(user_settings)
    .set({ calendar_token: null })
    .where(eq(user_settings.user_id, user.id));

  revalidatePath("/settings");
  return { ok: true };
}
