"use server";

import { revalidatePath } from "next/cache";

import { forUser } from "@/lib/db/scope";
import { user_settings } from "@/lib/db/schema";
import { getUser } from "@/lib/session";
import { newToken } from "@/lib/token";

import type { ActionResult } from "./transactions";

export async function generateCalendarToken(): Promise<
  ActionResult<{ token: string }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const token = newToken();
  const updated = await forUser(user.id)
    .update(user_settings, { calendar_token: token })
    .returning({ id: user_settings.user_id });
  if (!updated.length) return { ok: false, error: "Settings not found" };

  revalidatePath("/settings");
  return { ok: true, data: { token } };
}

export async function revokeCalendarToken(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  await forUser(user.id).update(user_settings, { calendar_token: null });

  revalidatePath("/settings");
  return { ok: true };
}
