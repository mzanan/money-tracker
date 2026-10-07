"use client";

import Link from "next/link";
import {
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/textAction";
import { CashActionDrawer } from "@/components/cash/cashActionDrawer";
import { useCashActionDrawer } from "@/components/cash/useCashActionDrawer";

import { AddAccountTab } from "./addAccountTab";
import { ImportFromImage } from "./importFromImage";
import { SourceTab } from "./sourceTab";
import { SourceTabMenu } from "./sourceTabMenu";
import { useSourceFilter } from "./useSourceFilter";
import { useTabStripOverflow } from "./useTabStripOverflow";

interface Props {
  sources: string[];
  csvSources: string[];
  withdrawalSources: string[];
  selected: string;
  onChange: (source: string) => void;
}

export function SourceFilter({
  sources,
  csvSources,
  withdrawalSources,
  selected,
  onChange,
}: Props) {
  const {
    kind,
    pending,
    allTabSources,
    tabSources,
    showCashTab,
    labelOf,
    handleSync,
    handleEnableCash,
  } = useSourceFilter({ sources, selected, onChange });
  const {
    rowRef,
    scrollerRef,
    contentRef,
    actionsRef,
    accountLabelRef,
    importLabelRef,
    compact,
  } = useTabStripOverflow();
  const cash = useCashActionDrawer();
  const cashActions = {
    onWithdraw: withdrawalSources.length > 0 ? cash.openWithdraw : undefined,
    onExchange: cash.openExchange,
  };

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
                    label={labelOf(src)}
                    cashActions={src === "manual" ? cashActions : undefined}
                  />
                }
              >
                {labelOf(src)}
              </SourceTab>
            ))}
            {!showCashTab && (
              <TextAction onClick={handleEnableCash} disabled={pending}>
                <PlusIcon className="size-3.5" />
                Cash
              </TextAction>
            )}
          </div>
        </div>
        <div
          ref={actionsRef}
          className="flex shrink-0 items-center gap-5 pr-4 pl-5"
        >
          <AddAccountTab
            onAdded={onChange}
            compact={compact}
            labelRef={accountLabelRef}
          />
          <ImportFromImage
            existingSources={allTabSources}
            compact={compact}
            labelRef={importLabelRef}
          />
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
          <Link href="/settings?tab=accounts">
            <ExternalLinkIcon />
            Re-import
          </Link>
        </Button>
      )}
      <CashActionDrawer
        open={cash.open}
        action={cash.shownAction}
        onClose={cash.close}
        withdrawalSources={withdrawalSources}
      />
    </div>
  );
}
