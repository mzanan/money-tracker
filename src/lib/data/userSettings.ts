import { cache } from "react";

import { supportedOrDefault } from "@/lib/constants/currencies";
import { findUserIdByCalendarToken } from "@/lib/db/preAuth";
import { forUser } from "@/lib/db/scope";
import { user_settings } from "@/lib/db/schema";
import type { AssistantSettings, ClientSettings } from "@/types/db";

export const getUserSettings = cache(
  async (userId: string): Promise<ClientSettings | null> => {
    const rows = await forUser(userId)
      .select({
        user_id: user_settings.user_id,
        currencies: user_settings.currencies,
        fixed_labels: user_settings.fixed_labels,
        base_currency: user_settings.base_currency,
        timezone: user_settings.timezone,
        cash_enabled: user_settings.cash_enabled,
        default_source: user_settings.default_source,
        archived_sources: user_settings.archived_sources,
        ai_provider: user_settings.ai_provider,
        ai_model: user_settings.ai_model,
        ai_api_key: user_settings.ai_api_key,
        onboarded_at: user_settings.onboarded_at,
        created_at: user_settings.created_at,
        updated_at: user_settings.updated_at,
      })
      .from(user_settings)
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const { ai_api_key, ...rest } = row;
    return {
      ...rest,
      currencies: supportedOrDefault(rest.currencies),
      hasAiKey: Boolean(ai_api_key),
    };
  },
);

export const getAssistantSettings = cache(
  async (userId: string): Promise<AssistantSettings | null> => {
    const rows = await forUser(userId)
      .select({
        base_currency: user_settings.base_currency,
        timezone: user_settings.timezone,
        ai_provider: user_settings.ai_provider,
        ai_model: user_settings.ai_model,
        ai_api_key: user_settings.ai_api_key,
      })
      .from(user_settings)
      .limit(1);
    return rows[0] ?? null;
  },
);

export const getCalendarToken = cache(
  async (userId: string): Promise<string | null> => {
    const rows = await forUser(userId)
      .select({ calendar_token: user_settings.calendar_token })
      .from(user_settings)
      .limit(1);
    return rows[0]?.calendar_token ?? null;
  },
);

export async function getUserIdByCalendarToken(
  token: string,
): Promise<string | null> {
  return findUserIdByCalendarToken(token);
}
