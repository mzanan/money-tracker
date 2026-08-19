"use client";

import { useDeferredMenuAction } from "@/hooks/useDeferredMenuAction";
import { useDialogState } from "@/hooks/useDialogState";
import { useServerAction } from "@/hooks/useServerAction";
import {
  deleteIntegration,
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
  const connected = integration !== null;

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

  return { pending, dialog, connected, handleSync, handleDisconnect };
}
