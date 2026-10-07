"use client";

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
import { syncSummary } from "@/lib/syncSummary";
import type { IntegrationProvider } from "@/types/db";

export function useSourceFilter({
  sources,
  selected,
  onChange,
}: {
  sources: string[];
  selected: string;
  onChange: (source: string) => void;
}) {
  const settings = useSettings();
  const accountLabels = useAccountLabels();
  const { run, pending } = useServerAction();
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

  function labelOf(source: string) {
    return resolveSourceLabel(source, accountLabels);
  }

  function handleSync() {
    if (kind !== "api") return;
    run(() => syncIntegration(selected as IntegrationProvider), {
      success: (data) => syncSummary(labelOf(selected), data),
    });
  }

  function handleEnableCash() {
    run(() => setCashEnabled(true), { success: "Cash account enabled" });
    onChange("manual");
  }

  return {
    kind,
    pending,
    allTabSources,
    tabSources,
    showCashTab,
    labelOf,
    handleSync,
    handleEnableCash,
  };
}
