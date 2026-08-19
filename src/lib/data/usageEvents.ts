import { db } from "@/lib/db";
import { usage_events } from "@/lib/db/schema";

export type UsageEvent = (typeof usage_events.$inferInsert)["event"];

interface LogUsageEventInput {
  userId: string | null;
  event: UsageEvent;
  detail?: string | null;
  country?: string | null;
}

export async function logUsageEvent(input: LogUsageEventInput): Promise<void> {
  try {
    await db.insert(usage_events).values({
      user_id: input.userId,
      event: input.event,
      detail: input.detail ?? null,
      country: input.country ?? null,
    });
  } catch (error) {
    console.error("[usageEvents] log failed:", error);
  }
}

export function countryFromHeaders(headers: Headers): string | null {
  return headers.get("x-vercel-ip-country");
}
