"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  AUTO_HIDE_MS,
  DISMISS_KEY,
  getIosServerSnapshot,
  getIosSnapshot,
  markInstallHintDismissed,
  subscribeDismiss,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

export function useInstallHint() {
  const [androidEvent, setAndroidEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [expired, setExpired] = useState(false);

  const showIos = useSyncExternalStore(
    subscribeDismiss,
    getIosSnapshot,
    getIosServerSnapshot,
  );

  const visible = Boolean(androidEvent) || showIos;

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setExpired(true), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      setAndroidEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const close = useCallback(() => {
    markInstallHintDismissed();
    setAndroidEvent(null);
  }, []);

  const install = useCallback(async () => {
    if (!androidEvent) return;
    await androidEvent.prompt();
    const choice = await androidEvent.userChoice;
    if (choice.outcome === "accepted") close();
    else setAndroidEvent(null);
  }, [androidEvent, close]);

  return {
    show: visible && !expired,
    isAndroid: Boolean(androidEvent),
    install,
    close,
  };
}
