"use client";

import { useRef } from "react";

const DROPDOWN_CLOSE_MS = 150;

export function useDeferredMenuAction() {
  const pendingRef = useRef(false);

  return function runAfterMenuClose(fn: () => void) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setTimeout(() => {
      pendingRef.current = false;
      fn();
    }, DROPDOWN_CLOSE_MS);
  };
}
