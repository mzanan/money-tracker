"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ExternalLinkIcon,
  ImageUpIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import type { CandidateMatch } from "@/hooks/useScreenshotImport";
import { previewCandidatesAction } from "@/lib/actions/screenshotImport";
import { syncIntegration } from "@/lib/actions/integrations";
import { setCashEnabled } from "@/lib/actions/settings";
import { kindOfSource, labelForSource } from "@/lib/constants/sources";
import type { DetectedTransaction } from "@/lib/ai/screenshotExtract";
import { cn } from "@/lib/utils";
import type { IntegrationProvider } from "@/types/db";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScreenshotImporter } from "@/components/screenshot/screenshotImporter";

interface Props {
  sources: string[];
  selected: string;
  onChange: (source: string) => void;
}

interface ScreenshotPayload {
  items: DetectedTransaction[];
  ignored: number;
  candidates: Record<number, CandidateMatch[]>;
}

async function extractFromScreenshot(file: File): Promise<
  | { ok: true; items: DetectedTransaction[]; ignored: number }
  | { ok: false; error: string }
> {
  const form = new FormData();
  form.append("image", file);
  try {
    const res = await fetch("/api/screenshot/extract", {
      method: "POST",
      body: form,
    });
    const payload = (await res.json()) as
      | { items?: DetectedTransaction[]; ignored?: number }
      | { error: string };
    if (!res.ok) {
      const err = "error" in payload ? payload.error : "Could not read screenshot";
      return { ok: false, error: err };
    }
    const items = "items" in payload ? (payload.items ?? []) : [];
    const ignored = "ignored" in payload ? (payload.ignored ?? 0) : 0;
    return { ok: true, items, ignored };
  } catch {
    return { ok: false, error: "Network error while reading screenshot" };
  }
}

async function loadCandidatesFor(
  items: DetectedTransaction[],
): Promise<Record<number, CandidateMatch[]>> {
  if (items.length === 0) return {};
  const queries = items.map((item) => ({
    occurredOn: item.occurredOn,
    amount: item.amount,
    currency: item.currency.toUpperCase(),
    kind: item.kind,
  }));
  const result = await previewCandidatesAction(queries);
  if (!result.ok || !result.data) return {};
  const map: Record<number, CandidateMatch[]> = {};
  for (const entry of result.data.candidates) {
    if (entry.matches.length > 0) map[entry.index] = entry.matches;
  }
  return map;
}

export function SourceFilter({ sources, selected, onChange }: Props) {
  const settings = useSettings();
  const { run, pending } = useServerAction();
  const kind = selected === "all" ? null : kindOfSource(selected);

  const hasManual = sources.includes("manual");
  const showCashTab = settings.cash_enabled || hasManual;
  const tabSources = showCashTab && !hasManual ? ["manual", ...sources] : sources;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<ScreenshotPayload | null>(null);
  const [extracting, startExtract] = useTransition();

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

  function handleScreenshotFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    startExtract(async () => {
      const extract = await extractFromScreenshot(file);
      if (!extract.ok) {
        toast.error(extract.error);
        return;
      }
      if (extract.items.length === 0) {
        toast.info(
          extract.ignored > 0
            ? `${extract.ignored} non-financial notification(s) skipped.`
            : "No financial notifications found in that screenshot.",
        );
        return;
      }
      const candidates = await loadCandidatesFor(extract.items);
      setPayload({
        items: extract.items,
        ignored: extract.ignored,
        candidates,
      });
    });
  }

  return (
    <>
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {extracting ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <ImageUpIcon className="size-3.5" />
            )}
            Import from screenshot
          </button>
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleScreenshotFile}
        className="hidden"
      />

      <Dialog
        open={payload !== null}
        onOpenChange={(open) => {
          if (!open) setPayload(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from screenshot</DialogTitle>
          </DialogHeader>
          {payload && (
            <ScreenshotImporter
              initialItems={payload.items}
              initialIgnored={payload.ignored}
              initialCandidates={payload.candidates}
              onDone={() => setPayload(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
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
