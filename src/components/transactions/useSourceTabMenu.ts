"use client";

import { useDeferredMenuAction } from "@/hooks/useDeferredMenuAction";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { setDefaultSource, setSourceArchived } from "@/lib/actions/settings";

import { useCashActionDrawer } from "@/components/cash/useCashActionDrawer";

export function useSourceTabMenu(source: string) {
  const settings = useSettings();
  const { run, pending } = useServerAction();
  const runAfterMenuClose = useDeferredMenuAction();
  const cash = useCashActionDrawer();

  const isDefault = (settings.default_source ?? "all") === source;

  function setDefault(next: string) {
    runAfterMenuClose(() =>
      run(() => setDefaultSource(next), { success: "Default tab updated" }),
    );
  }

  function archive() {
    runAfterMenuClose(() =>
      run(() => setSourceArchived(source, true), { success: "Tab archived" }),
    );
  }

  return {
    isDefault,
    makeDefault: () => setDefault(source),
    clearDefault: () => setDefault("all"),
    archive,
    pending,
    cashAction: cash.action,
    openWithdraw: () => runAfterMenuClose(cash.openWithdraw),
    openExchange: () => runAfterMenuClose(cash.openExchange),
    closeCashAction: cash.close,
  };
}
