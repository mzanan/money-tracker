import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { todayInTz } from "@/lib/dates";
import type { CandidateMatch } from "@/lib/imageExtract";
import { SHARE_ERROR_CODES, type ShareErrorCode } from "@/lib/screenshotShare";

import { findCrossSourceCandidates } from "./duplicates";
import { getUserSources } from "./sources";

const SHARE_COOKIE = "mt_share_payload";

export interface SharePayload {
  items?: DetectedTransaction[];
  ignored?: number;
}

export const SHARE_ERRORS: Record<ShareErrorCode, string> = {
  invalid: "Could not read the upload. Try again.",
  type: "Unsupported image type. Use PNG, JPEG or WebP.",
  size: "Image is too large (max 6 MB).",
  byok_required: "Image import runs on your own AI key. Add it in Settings.",
  key_decrypt_failed:
    "Your API key could not be read. Re-enter it in Settings.",
  extract: "Could not read that screenshot. Try a clearer photo.",
  too_many_items:
    "Too many items detected to hand off automatically. Upload the screenshot again from this page.",
};

export function isShareErrorCode(value: string): value is ShareErrorCode {
  return (SHARE_ERROR_CODES as readonly string[]).includes(value);
}

async function buildInitialCandidates(
  userId: string,
  items: DetectedTransaction[],
  today: string,
): Promise<Record<number, CandidateMatch[]>> {
  const queries = items.map((item) => ({
    userId,
    occurredOn: item.occurredOn ?? today,
    amount: item.amount,
    currency: item.currency.toUpperCase(),
    kind: item.kind,
  }));
  const result = await findCrossSourceCandidates(queries);
  const map: Record<number, CandidateMatch[]> = {};
  result.forEach((entry, index) => {
    if (entry.matches.length === 0) return;
    map[index] = entry.matches.map((m) => ({
      id: m.id,
      source: m.source,
      occurredOn: m.occurred_on,
      amount: m.amount_original,
      currency: m.currency_original,
      kind: m.kind,
      note: m.note,
    }));
  });
  return map;
}

export interface ScreenshotImportPageData {
  initial: SharePayload | null;
  fromShare: boolean;
  initialCandidates: Record<number, CandidateMatch[]>;
  existingSources: string[];
}

export async function getScreenshotImportPageData(
  userId: string,
): Promise<ScreenshotImportPageData> {
  const jar = await cookies();
  const raw = jar.get(SHARE_COOKIE);
  const fromShare = raw?.value != null;

  let initial: SharePayload | null = null;
  if (raw?.value) {
    try {
      initial = JSON.parse(raw.value) as SharePayload;
    } catch {
      initial = null;
    }
  }

  let initialCandidates: Record<number, CandidateMatch[]> = {};
  if (initial?.items && initial.items.length > 0) {
    const settings = await db
      .select({ timezone: user_settings.timezone })
      .from(user_settings)
      .where(eq(user_settings.user_id, userId))
      .limit(1)
      .then((rows) => rows[0]);
    const today = todayInTz(settings?.timezone ?? "UTC");
    initialCandidates = await buildInitialCandidates(
      userId,
      initial.items,
      today,
    );
  }

  const existingSources = await getUserSources(userId);

  return { initial, fromShare, initialCandidates, existingSources };
}
