"use client";

import { useEffect } from "react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useHeldSources } from "@/hooks/useHeldAccounts";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { syncIntegration } from "@/lib/actions/integrations";
import {
  homeHiddenSources,
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

  const heldSources = useHeldSources();
  const hiddenSources = homeHiddenSources(
    settings.archived_sources ?? [],
    heldSources,
  );
  const allTabSources = tabSourcesFrom(sources);
  const tabSources = withoutArchived(allTabSources, hiddenSources);

  const selectedHidden = selected !== "all" && hiddenSources.includes(selected);

  useEffect(() => {
    if (selectedHidden) onChange("all");
  }, [selectedHidden, onChange]);

  function labelOf(source: string) {
    return resolveSourceLabel(source, accountLabels);
  }

  function handleSync() {
    if (kind !== "api") return;
    run(() => syncIntegration(selected as IntegrationProvider), {
      success: (data) => syncSummary(labelOf(selected), data),
    });
  }

  return {
    kind,
    pending,
    allTabSources,
    tabSources,
    labelOf,
    handleSync,
  };
}
