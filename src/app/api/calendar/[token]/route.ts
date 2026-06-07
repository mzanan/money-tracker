import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { recurring_payments, user_settings } from "@/lib/db/schema";
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

  const account = await db
    .select({ user_id: user_settings.user_id })
    .from(user_settings)
    .where(eq(user_settings.calendar_token, cleanToken))
    .limit(1)
    .then((rows) => rows[0]);

  if (!account) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const reminders = await db
    .select()
    .from(recurring_payments)
    .where(
      and(
        eq(recurring_payments.user_id, account.user_id),
        eq(recurring_payments.active, true),
      ),
    )
    .orderBy(asc(recurring_payments.next_due_on));

  const body = buildIcsFeed(reminders);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
