"use client";

import { useEffect, useRef } from "react";

const STATE_KEY = "mt_panel";

export function useHistoryClose(
  active: boolean,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  // StrictMode's dev-only mount->cleanup->mount re-runs this effect
  // synchronously (before any timer fires), so the remount cancels the
  // pending cleanup below before it ever calls history.back(). That means a
  // StrictMode remount never triggers history.back() at all, so there's no
  // self-triggered popstate to mistake for a real back-press, and a genuine
  // close (no remount) still cleans up its pushed entry once the timer runs.
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;

    if (cleanupTimeoutRef.current !== null) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
    window.history.pushState({ [STATE_KEY]: true }, "");
    function onPop() {
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      cleanupTimeoutRef.current = setTimeout(() => {
        cleanupTimeoutRef.current = null;
        if (window.history.state?.[STATE_KEY]) {
          window.history.back();
        }
      }, 0);
    };
  }, [active]);
}
