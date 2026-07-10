import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { ScreenshotImporter } from "@/components/screenshot/screenshotImporter";
import { Button } from "@/components/ui/button";
import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import { findCrossSourceCandidates } from "@/lib/data/duplicates";
import { getUserSources } from "@/lib/data/sources";
import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { todayInTz } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { eq } from "drizzle-orm";

import type { CandidateMatch } from "@/hooks/useScreenshotImport";

const SHARE_COOKIE = "mt_share_payload";

interface SharePayload {
  items?: DetectedTransaction[];
  ignored?: number;
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

export default async function ScreenshotImportPage() {
  const user = await requireUser();
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
      .where(eq(user_settings.user_id, user.id))
      .limit(1)
      .then((rows) => rows[0]);
    const today = todayInTz(settings?.timezone ?? "UTC");
    initialCandidates = await buildInitialCandidates(
      user.id,
      initial.items,
      today,
    );
  }
  const existingSources = await getUserSources(user.id);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link href="/">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Import from screenshot
          </h1>
          <p className="text-muted-foreground text-xs">
            Drop a screenshot of bank or wallet notifications. We read each one
            and you pick what to import.
          </p>
        </div>
      </header>

      <ScreenshotImporter
        initialItems={initial?.items ?? null}
        initialIgnored={initial?.ignored ?? 0}
        initialCandidates={initialCandidates}
        existingSources={existingSources}
        consumeShareCookie={fromShare}
      />
    </div>
  );
}
