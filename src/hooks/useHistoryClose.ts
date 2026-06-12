"use client";

import { useEffect, useRef } from "react";

const STATE_KEY = "mt_panel";

export function useHistoryClose(
  active: boolean,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;

    let closedByPop = false;
    window.history.pushState({ [STATE_KEY]: true }, "");
    function onPop() {
      closedByPop = true;
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!closedByPop && window.history.state?.[STATE_KEY]) {
        window.history.back();
      }
    };
  }, [active]);
}
