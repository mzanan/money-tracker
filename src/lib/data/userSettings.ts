import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import type { UserSettings } from "@/types/db";

export const getUserSettings = cache(
  async (userId: string): Promise<UserSettings | null> => {
    const rows = await db
      .select()
      .from(user_settings)
      .where(eq(user_settings.user_id, userId))
      .limit(1);
    return rows[0] ?? null;
  },
);
