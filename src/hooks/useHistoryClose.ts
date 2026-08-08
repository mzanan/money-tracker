"use client";

import { useEffect, useRef } from "react";

const STATE_KEY = "mt_panel";

export function useHistoryClose(
  active: boolean,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  // Cleanup's own `history.back()` fires an async popstate. Under
  // StrictMode's mount->cleanup->mount, a fresh onPop is already listening
  // by the time that popstate arrives and would otherwise treat it as a
  // real back-press and close what was just re-opened. This ref survives
  // the remount (refs aren't reset by cleanup) so the next onPop can tell
  // it was self-triggered and ignore it.
  const selfTriggeredRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;

    window.history.pushState({ [STATE_KEY]: true }, "");
    function onPop() {
      if (selfTriggeredRef.current) {
        selfTriggeredRef.current = false;
        return;
      }
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.[STATE_KEY]) {
        selfTriggeredRef.current = true;
        window.history.back();
      }
    };
  }, [active]);
}
