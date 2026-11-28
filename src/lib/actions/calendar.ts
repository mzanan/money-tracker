"use server";

import { revalidatePath } from "next/cache";

import { updateCalendarToken } from "@/lib/data/userSettings";
import { getUser } from "@/lib/session";
import { newToken } from "@/lib/token";

import type { ActionResult } from "./transactions";

export async function generateCalendarToken(): Promise<
  ActionResult<{ token: string }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const token = newToken();
  const updated = await updateCalendarToken(user.id, token);
  if (!updated) return { ok: false, error: "Settings not found" };

  revalidatePath("/settings");
  return { ok: true, data: { token } };
}

export async function revokeCalendarToken(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  await updateCalendarToken(user.id, null);

  revalidatePath("/settings");
  return { ok: true };
}
