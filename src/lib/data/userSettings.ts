import { sql } from "drizzle-orm";
import { cache } from "react";

import { supportedOrDefault } from "@/lib/constants/currencies";
import { findUserIdByCalendarToken } from "@/lib/db/preAuth";
import { forUser } from "@/lib/db/scope";
import { user_settings } from "@/lib/db/schema";
import type {
  AssistantSettings,
  ClientSettings,
  UserSettingsInsert,
  UserSettingsUpdate,
} from "@/types/db";

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

async function readSettings<
  K extends "timezone" | "archived_sources" | "currencies",
>(userId: string, columns: Pick<typeof user_settings, K>) {
  const rows = await forUser(userId)
    .select(columns)
    .from(user_settings)
    .limit(1);
  return rows[0];
}

export async function getUserTimezone(
  userId: string,
): Promise<{ timezone: string | null } | undefined> {
  return readSettings(userId, { timezone: user_settings.timezone });
}

export async function getArchivedSources(
  userId: string,
): Promise<{ archived_sources: string[] } | undefined> {
  return readSettings(userId, {
    archived_sources: user_settings.archived_sources,
  });
}

export async function getUserCurrencies(
  userId: string,
): Promise<{ currencies: string[] } | undefined> {
  return readSettings(userId, { currencies: user_settings.currencies });
}

export async function upsertOnboardedSettings(
  userId: string,
  values: Pick<
    UserSettingsInsert,
    "currencies" | "base_currency" | "timezone" | "onboarded_at"
  >,
): Promise<void> {
  await forUser(userId)
    .insert(user_settings, values)
    .onConflictDoUpdate({ target: user_settings.user_id, set: values });
}

export async function updateDefaultSource(
  userId: string,
  source: string,
): Promise<void> {
  await forUser(userId).update(user_settings, { default_source: source });
}

export async function setSourceArchivedFlag(
  userId: string,
  source: string,
  archived: boolean,
): Promise<void> {
  const remaining = sql`(SELECT value FROM json_each(${user_settings.archived_sources}) WHERE value != ${source})`;
  await forUser(userId).update(
    user_settings,
    archived
      ? {
          archived_sources: sql`(SELECT json_group_array(value) FROM (SELECT value FROM ${remaining} UNION ALL SELECT ${source}))`,
          default_source: sql`CASE WHEN ${user_settings.default_source} = ${source} THEN NULL ELSE ${user_settings.default_source} END`,
        }
      : {
          archived_sources: sql`(SELECT json_group_array(value) FROM ${remaining})`,
        },
  );
}

export async function updateFixedLabels(
  userId: string,
  labels: string[],
): Promise<void> {
  await forUser(userId).update(user_settings, { fixed_labels: labels });
}

export async function updateAssistantKey(
  userId: string,
  values: Pick<UserSettingsUpdate, "ai_provider" | "ai_model" | "ai_api_key">,
): Promise<void> {
  await forUser(userId).update(user_settings, values);
}

export async function updateGeneralSettings(
  userId: string,
  values: Pick<UserSettingsUpdate, "currencies" | "base_currency" | "timezone">,
): Promise<void> {
  await forUser(userId).update(user_settings, values);
}

export async function updateCalendarToken(
  userId: string,
  token: string | null,
): Promise<number> {
  const updated = await forUser(userId)
    .update(user_settings, { calendar_token: token })
    .returning({ id: user_settings.user_id });
  return updated.length;
}
