"use client";

import { useEffect, useRef } from "react";

const STATE_KEY = "mt_panel";

export function useHistoryClose(
  active: boolean,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  // A StrictMode remount, or a real close immediately followed by a
  // reopen, both re-run this effect before the deferred cleanup below has
  // fired. Cancelling that pending history.back() alone isn't enough: it
  // still leaves the entry it would have popped sitting in the stack,
  // un-consumed. Reusing that entry (skip pushState when already on it)
  // instead of always pushing a new one avoids ever creating that orphan,
  // so a later close only ever has one entry of its own to pop.
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
    if (!window.history.state?.[STATE_KEY]) {
      window.history.pushState({ [STATE_KEY]: true }, "");
    }
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
