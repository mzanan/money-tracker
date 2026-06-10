"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { getUser } from "@/lib/session";

import type { ActionResult } from "./transactions";

function cleanDate(value: string | null | undefined): string | null | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

export async function createLocation(input: {
  label: string;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<ActionResult> {
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Place name is required" };
  if (label.length > 40) {
    return { ok: false, error: "Place name must be 40 characters or fewer" };
  }

  const startDate = cleanDate(input.startDate);
  const endDate = cleanDate(input.endDate);
  if (startDate === undefined || endDate === undefined) {
    return { ok: false, error: "Invalid date" };
  }
  if (startDate && endDate && endDate < startDate) {
    return { ok: false, error: "End date is before start date" };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    await db.insert(locations).values({
      user_id: user.id,
      label,
      start_date: startDate,
      end_date: endDate,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save failed",
    };
  }
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    await db
      .delete(locations)
      .where(and(eq(locations.id, id), eq(locations.user_id, user.id)));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}
