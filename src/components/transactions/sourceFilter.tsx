"use client";

import Link from "next/link";
import {
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { syncIntegration } from "@/lib/actions/integrations";
import { setCashEnabled } from "@/lib/actions/settings";
import { kindOfSource, resolveSourceLabel } from "@/lib/constants/sources";
import type { IntegrationProvider } from "@/types/db";

import { Button } from "@/components/ui/button";

import { ImportFromImage } from "./importFromImage";
import { SourceTab } from "./sourceTab";

interface Props {
  sources: string[];
  csvSources: string[];
  selected: string;
  onChange: (source: string) => void;
}

export function SourceFilter({
  sources,
  csvSources,
  selected,
  onChange,
}: Props) {
  const settings = useSettings();
  const accountLabels = useAccountLabels();
  const { run, pending } = useServerAction();
  const kind = selected === "all" ? null : kindOfSource(selected);

  const hasManual = sources.includes("manual");
  const showCashTab = settings.cash_enabled || hasManual;
  const tabSources = showCashTab && !hasManual ? ["manual", ...sources] : sources;

  function handleSync() {
    if (kind !== "api") return;
    run(() => syncIntegration(selected as IntegrationProvider), {
      success: (data) =>
        `${resolveSourceLabel(selected, accountLabels)}: imported ${data?.imported ?? 0}` +
        ((data?.skipped ?? 0) > 0 ? `, ${data?.skipped} skipped` : "") +
        ((data?.absorbed ?? 0) > 0
          ? `, ${data?.absorbed} merged from manual`
          : ""),
    });
  }

  function handleEnableCash() {
    run(() => setCashEnabled(true), { success: "Cash account enabled" });
    onChange("manual");
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div
        role="tablist"
        className="scrollbar-none border-border/60 -mx-4 flex flex-1 gap-5 overflow-x-auto overflow-y-hidden border-b px-4"
      >
        <SourceTab
          selected={selected === "all"}
          onClick={() => onChange("all")}
        >
          All
        </SourceTab>
        {tabSources.map((src) => (
          <SourceTab
            key={src}
            selected={selected === src}
            onClick={() => onChange(src)}
          >
            {resolveSourceLabel(src, accountLabels)}
          </SourceTab>
        ))}
        {!showCashTab && (
          <button
            type="button"
            onClick={handleEnableCash}
            disabled={pending}
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <PlusIcon className="size-3.5" />
            Cash
          </button>
        )}
        <ImportFromImage existingSources={tabSources} />
      </div>
      {kind === "api" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSync}
          disabled={pending}
          className="rounded-full"
        >
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <RefreshCwIcon />
          )}
          Sync
        </Button>
      )}
      {csvSources.includes(selected) && (
        <Button
          size="sm"
          variant="secondary"
          asChild
          className="rounded-full"
        >
          <Link href="/settings">
            <ExternalLinkIcon />
            Re-import
          </Link>
        </Button>
      )}
    </div>
  );
}

