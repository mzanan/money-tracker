"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import {
  onboardingSchema,
  updateSettingsSchema,
  type OnboardingInput,
  type UpdateSettingsInput,
} from "@/lib/schemas/settings";
import { getUser } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveOnboarding(
  input: OnboardingInput,
): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const timezone = parsed.data.timezone?.trim() || null;
  const onboardedAt = new Date().toISOString();

  try {
    await db
      .insert(user_settings)
      .values({
        user_id: user.id,
        currencies: parsed.data.currencies,
        base_currency: parsed.data.baseCurrency,
        timezone,
        onboarded_at: onboardedAt,
      })
      .onConflictDoUpdate({
        target: user_settings.user_id,
        set: {
          currencies: parsed.data.currencies,
          base_currency: parsed.data.baseCurrency,
          timezone,
          onboarded_at: onboardedAt,
        },
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

export async function setCashEnabled(enabled: boolean): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    await db
      .update(user_settings)
      .set({ cash_enabled: enabled })
      .where(eq(user_settings.user_id, user.id));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save failed",
    };
  }
}

export async function updateSettings(
  input: UpdateSettingsInput,
): Promise<ActionResult> {
  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const timezone = parsed.data.timezone?.trim() || null;

  try {
    await db
      .update(user_settings)
      .set({
        currencies: parsed.data.currencies,
        base_currency: parsed.data.baseCurrency,
        timezone,
      })
      .where(eq(user_settings.user_id, user.id));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save failed",
    };
  }
}
