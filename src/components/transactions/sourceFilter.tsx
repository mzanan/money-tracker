"use client";

import Link from "next/link";
import {
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";

import { useEffect } from "react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { syncIntegration } from "@/lib/actions/integrations";
import { setCashEnabled } from "@/lib/actions/settings";
import {
  kindOfSource,
  resolveSourceLabel,
  tabSourcesFrom,
  withoutArchived,
} from "@/lib/constants/sources";
import type { IntegrationProvider } from "@/types/db";

import { Button } from "@/components/ui/button";

import { AddAccountTab } from "./addAccountTab";
import { ImportFromImage } from "./importFromImage";
import { SourceTab } from "./sourceTab";
import { SourceTabAction } from "./sourceTabAction";
import { SourceTabMenu } from "./sourceTabMenu";
import { useTabStripOverflow } from "./useTabStripOverflow";

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
  const { rowRef, scrollerRef, contentRef, actionsRef, compact } =
    useTabStripOverflow();
  const kind = selected === "all" ? null : kindOfSource(selected);

  const archivedSources = settings.archived_sources ?? [];
  const allTabSources = tabSourcesFrom(sources, settings.cash_enabled);
  const tabSources = withoutArchived(allTabSources, archivedSources);
  const showCashTab = allTabSources.includes("manual");

  const selectedArchived =
    selected !== "all" && archivedSources.includes(selected);

  useEffect(() => {
    if (selectedArchived) onChange("all");
  }, [selectedArchived, onChange]);

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
        ref={rowRef}
        className="border-border/60 -mx-4 flex min-w-0 flex-1 border-b"
      >
        <div
          ref={scrollerRef}
          className="min-w-0 scrollbar-none overflow-x-auto overflow-y-hidden pl-4"
        >
          <div ref={contentRef} role="tablist" className="flex w-max gap-5">
            <SourceTab
              selected={selected === "all"}
              onClick={() => onChange("all")}
              menu={<SourceTabMenu source="all" label="All" />}
            >
              All
            </SourceTab>
            {tabSources.map((src) => (
              <SourceTab
                key={src}
                selected={selected === src}
                onClick={() => onChange(src)}
                menu={
                  <SourceTabMenu
                    source={src}
                    label={resolveSourceLabel(src, accountLabels)}
                  />
                }
              >
                {resolveSourceLabel(src, accountLabels)}
              </SourceTab>
            ))}
            {!showCashTab && (
              <SourceTabAction onClick={handleEnableCash} disabled={pending}>
                <PlusIcon className="size-3.5" />
                Cash
              </SourceTabAction>
            )}
          </div>
        </div>
        <div
          ref={actionsRef}
          className="flex shrink-0 items-center gap-5 pr-4 pl-5"
        >
          <AddAccountTab onAdded={onChange} />
          <ImportFromImage existingSources={allTabSources} compact={compact} />
        </div>
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
        <Button size="sm" variant="secondary" asChild className="rounded-full">
          <Link href="/settings?tab=data">
            <ExternalLinkIcon />
            Re-import
          </Link>
        </Button>
      )}
    </div>
  );
}
