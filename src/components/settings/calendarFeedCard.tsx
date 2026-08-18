import { getCalendarToken } from "@/lib/data/userSettings";
import { getUser } from "@/lib/session";

import { CalendarFeedPanel } from "./calendarFeedPanel";

export async function CalendarFeedCard() {
  const user = await getUser();
  if (!user) return null;

  const token = await getCalendarToken(user.id);

  const appUrl = (
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    ""
  ).replace(/\/$/, "");

  const feedUrl = token ? `${appUrl}/api/calendar/${token}.ics` : null;

  return <CalendarFeedPanel feedUrl={feedUrl} />;
}
