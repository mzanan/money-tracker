import { insertAnonymousUsageEvent } from "@/lib/db/preAuth";
import { forUser } from "@/lib/db/scope";
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
    const row = {
      event: input.event,
      detail: input.detail ?? null,
      country: input.country ?? null,
    };
    if (input.userId) await forUser(input.userId).insert(usage_events, row);
    else await insertAnonymousUsageEvent(row);
  } catch (error) {
    console.error("[usageEvents] log failed:", error);
  }
}

export function countryFromHeaders(headers: Headers): string | null {
  return headers.get("x-vercel-ip-country");
}

export async function logImageExtractError(
  userId: string,
  country: string | null,
  detail: string,
): Promise<void> {
  await logUsageEvent({
    userId,
    event: "image_extract_error",
    detail: detail.slice(0, 200),
    country,
  });
}
