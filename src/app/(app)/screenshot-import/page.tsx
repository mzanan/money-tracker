import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { ScreenshotImporter } from "@/components/screenshot/screenshotImporter";
import { ApiKeyRequiredDialog } from "@/components/ui/apiKeyRequiredNotice";
import { Button } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/errorText";
import {
  getScreenshotImportPageData,
  isShareErrorCode,
  SHARE_ERRORS,
} from "@/lib/data/screenshotImport";
import { getUserSettings } from "@/lib/data/userSettings";
import { requireUser } from "@/lib/session";

export default async function ScreenshotImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;
  const errorMessage = error && isShareErrorCode(error) ? SHARE_ERRORS[error] : undefined;
  const [settings, { initial, fromShare, initialCandidates, existingSources }] =
    await Promise.all([
      getUserSettings(user.id),
      getScreenshotImportPageData(user.id),
    ]);

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

      {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

      {settings?.hasAiKey ? (
        <ScreenshotImporter
          initialItems={initial?.items ?? null}
          initialIgnored={initial?.ignored ?? 0}
          initialCandidates={initialCandidates}
          existingSources={existingSources}
          consumeShareCookie={fromShare}
        />
      ) : (
        <ApiKeyRequiredDialog feature="Image import" />
      )}
    </div>
  );
}
