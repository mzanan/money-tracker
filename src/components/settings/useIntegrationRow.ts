"use client";

import { useDeferredMenuAction } from "@/hooks/useDeferredMenuAction";
import { useDialogState } from "@/hooks/useDialogState";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { syncStatus } from "@/lib/constants/sources";
import {
  deleteIntegration,
  setIntegrationAutoSync,
  syncIntegration,
} from "@/lib/actions/integrations";
import type { IntegrationProvider, IntegrationSummary } from "@/types/db";

interface Props {
  provider: IntegrationProvider;
  label: string;
  integration: IntegrationSummary | null;
}

export function useIntegrationRow({ provider, label, integration }: Props) {
  const { run, pending } = useServerAction();
  const runAfterMenuClose = useDeferredMenuAction();
  const dialog = useDialogState(runAfterMenuClose);
  const settings = useSettings();
  const connected = integration !== null;
  const archived = (settings.archived_sources ?? []).includes(provider);
  const status = syncStatus({
    connected,
    autoSync: integration?.autoSync ?? false,
    archived,
    lastError: archived ? null : (integration?.lastError ?? null),
  });

  function handleSync() {
    run(() => syncIntegration(provider), {
      success: (data) =>
        `Imported ${data?.imported ?? 0} transaction${data?.imported === 1 ? "" : "s"}` +
        ((data?.skipped ?? 0) > 0 ? `, ${data?.skipped} skipped` : "") +
        ((data?.absorbed ?? 0) > 0
          ? `, ${data?.absorbed} merged from manual entries`
          : ""),
    });
  }

  function handleDisconnect() {
    run(() => deleteIntegration(provider), {
      success: `${label} disconnected`,
    });
  }

  function handleAutoSyncChange(enabled: boolean) {
    run(() => setIntegrationAutoSync(provider, enabled), {
      success: enabled ? "Auto sync on" : "Auto sync paused",
    });
  }

  return {
    pending,
    dialog,
    connected,
    archived,
    status,
    autoSync: !archived && (integration?.autoSync ?? false),
    lastError: integration?.lastError ?? null,
    handleSync,
    handleDisconnect,
    handleAutoSyncChange,
  };
}
