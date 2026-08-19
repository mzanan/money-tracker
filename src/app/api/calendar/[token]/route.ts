import { NextResponse } from "next/server";

import { getActiveReminders } from "@/lib/data/reminders";
import { getUserIdByCalendarToken } from "@/lib/data/userSettings";
import { buildIcsFeed } from "@/lib/ical";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const cleanToken = token.replace(/\.ics$/i, "").trim();
  if (!cleanToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const userId = await getUserIdByCalendarToken(cleanToken);

  if (!userId) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const reminders = await getActiveReminders(userId);

  const body = buildIcsFeed(reminders);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
