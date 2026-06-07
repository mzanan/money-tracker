"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ShareIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa:installHintDismissed";
const DISMISS_EVENT = "pwa:installHintDismissed";

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  type NavigatorWithStandalone = Navigator & { standalone?: boolean };
  return (window.navigator as NavigatorWithStandalone).standalone === true;
}

function subscribeDismiss(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DISMISS_EVENT, callback);
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}

function getIosSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalone()) return false;
  if (localStorage.getItem(DISMISS_KEY) === "1") return false;
  return isIos();
}

function getIosServerSnapshot(): boolean {
  return false;
}

export function InstallHint() {
  const [androidEvent, setAndroidEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const showIos = useSyncExternalStore(
    subscribeDismiss,
    getIosSnapshot,
    getIosServerSnapshot,
  );

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
    localStorage.setItem(DISMISS_KEY, "1");
    setAndroidEvent(null);
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }, []);

  const install = useCallback(async () => {
    if (!androidEvent) return;
    await androidEvent.prompt();
    const choice = await androidEvent.userChoice;
    if (choice.outcome === "accepted") close();
    else setAndroidEvent(null);
  }, [androidEvent, close]);

  if (!androidEvent && !showIos) return null;

  return (
    <Surface
      radius="lg"
      padding="sm"
      className="fixed right-3 bottom-3 left-3 z-40 flex items-center gap-3 border shadow-lg sm:right-auto sm:left-3 sm:max-w-sm"
    >
      <div className="flex-1 text-sm">
        {androidEvent ? (
          <p>
            <span className="font-medium">Install Money Tracker</span> for
            faster access from your home screen.
          </p>
        ) : (
          <p className="flex items-center gap-1.5">
            <span className="font-medium">Add to Home Screen</span>
            <span className="text-muted-foreground">— tap</span>
            <ShareIcon className="text-muted-foreground inline size-3.5" />
            <span className="text-muted-foreground">
              then “Add to Home Screen”.
            </span>
          </p>
        )}
      </div>
      {androidEvent && (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={close} aria-label="Dismiss">
        <XIcon className="size-4" />
      </Button>
    </Surface>
  );
}
