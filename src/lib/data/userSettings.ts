import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import type { AssistantSettings, ClientSettings } from "@/types/db";

export const getUserSettings = cache(
  async (userId: string): Promise<ClientSettings | null> => {
    const rows = await db
      .select({
        user_id: user_settings.user_id,
        currencies: user_settings.currencies,
        base_currency: user_settings.base_currency,
        timezone: user_settings.timezone,
        cash_enabled: user_settings.cash_enabled,
        ai_provider: user_settings.ai_provider,
        ai_model: user_settings.ai_model,
        onboarded_at: user_settings.onboarded_at,
        created_at: user_settings.created_at,
        updated_at: user_settings.updated_at,
      })
      .from(user_settings)
      .where(eq(user_settings.user_id, userId))
      .limit(1);
    return rows[0] ?? null;
  },
);

export const getAssistantSettings = cache(
  async (userId: string): Promise<AssistantSettings | null> => {
    const rows = await db
      .select({
        base_currency: user_settings.base_currency,
        timezone: user_settings.timezone,
        ai_provider: user_settings.ai_provider,
        ai_model: user_settings.ai_model,
        ai_api_key: user_settings.ai_api_key,
      })
      .from(user_settings)
      .where(eq(user_settings.user_id, userId))
      .limit(1);
    return rows[0] ?? null;
  },
);

export const getCalendarToken = cache(
  async (userId: string): Promise<string | null> => {
    const rows = await db
      .select({ calendar_token: user_settings.calendar_token })
      .from(user_settings)
      .where(eq(user_settings.user_id, userId))
      .limit(1);
    return rows[0]?.calendar_token ?? null;
  },
);

export async function getUserIdByCalendarToken(
  token: string,
): Promise<string | null> {
  const rows = await db
    .select({ user_id: user_settings.user_id })
    .from(user_settings)
    .where(eq(user_settings.calendar_token, token))
    .limit(1);
  return rows[0]?.user_id ?? null;
}
