import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { getUser } from "@/lib/session";

import { CalendarFeedPanel } from "./calendarFeedPanel";

export async function CalendarFeedCard() {
  const user = await getUser();
  if (!user) return null;

  const row = await db
    .select({ token: user_settings.calendar_token })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  const appUrl = (
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    ""
  ).replace(/\/$/, "");

  const feedUrl = row?.token ? `${appUrl}/api/calendar/${row.token}.ics` : null;

  return <CalendarFeedPanel feedUrl={feedUrl} />;
}
