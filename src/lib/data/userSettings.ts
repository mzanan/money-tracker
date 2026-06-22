import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import type { ClientSettings } from "@/types/db";

export const getUserSettings = cache(
  async (userId: string): Promise<ClientSettings | null> => {
    const rows = await db
      .select({
        user_id: user_settings.user_id,
        currencies: user_settings.currencies,
        base_currency: user_settings.base_currency,
        timezone: user_settings.timezone,
        cash_enabled: user_settings.cash_enabled,
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
