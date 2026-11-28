import { eq } from "drizzle-orm";

import { db } from "./index";
import { usage_events, user_settings } from "./schema";

type AnonymousUsageEvent = {
  event: (typeof usage_events.$inferInsert)["event"];
  detail: string | null;
  country: string | null;
};

export async function findUserIdByCalendarToken(
  token: string,
): Promise<string | null> {
  const rows = await db
    .select({ user_id: user_settings.user_id })
    .from(user_settings)
    .where(eq(user_settings.calendar_token, token))
    .limit(1);
  return rows[0]?.user_id ?? null;
}

export async function insertAnonymousUsageEvent(
  input: AnonymousUsageEvent,
): Promise<void> {
  await db.insert(usage_events).values({ user_id: null, ...input });
}
