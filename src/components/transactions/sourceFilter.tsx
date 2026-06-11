"use client";

import Link from "next/link";
import {
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { syncIntegration } from "@/lib/actions/integrations";
import { setCashEnabled } from "@/lib/actions/settings";
import { kindOfSource, labelForSource } from "@/lib/constants/sources";
import { cn } from "@/lib/utils";
import type { IntegrationProvider } from "@/types/db";

import { Button } from "@/components/ui/button";

import { ImportFromImage } from "./importFromImage";

interface Props {
  sources: string[];
  selected: string;
  onChange: (source: string) => void;
}

export function SourceFilter({ sources, selected, onChange }: Props) {
  const settings = useSettings();
  const { run, pending } = useServerAction();
  const kind = selected === "all" ? null : kindOfSource(selected);

  const hasManual = sources.includes("manual");
  const showCashTab = settings.cash_enabled || hasManual;
  const tabSources = showCashTab && !hasManual ? ["manual", ...sources] : sources;

  function handleSync() {
    if (kind !== "api") return;
    run(() => syncIntegration(selected as IntegrationProvider), {
      success: (data) =>
        `${labelForSource(selected)}: imported ${data?.imported ?? 0}` +
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
        className="scrollbar-thin border-border/60 -mx-4 flex flex-1 gap-5 overflow-x-auto border-b px-4"
      >
        <Tab selected={selected === "all"} onClick={() => onChange("all")}>
          All
        </Tab>
        {tabSources.map((src) => (
          <Tab
            key={src}
            selected={selected === src}
            onClick={() => onChange(src)}
          >
            {labelForSource(src)}
          </Tab>
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
        <ImportFromImage />
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
      {kind === "csv" && (
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

function Tab({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      aria-selected={selected}
      className={cn(
        "relative shrink-0 py-3 text-sm transition-colors",
        selected
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground font-medium",
      )}
    >
      {children}
      {selected && (
        <span
          aria-hidden
          className="bg-foreground absolute -bottom-px left-0 right-0 h-0.5"
        />
      )}
    </button>
  );
}
