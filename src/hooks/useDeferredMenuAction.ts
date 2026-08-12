"use client";

import { useCallback, useEffect, useRef } from "react";

const DROPDOWN_CLOSE_MS = 150;

export function useDeferredMenuAction() {
  const pendingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(function runAfterMenuClose(fn: () => void) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      pendingRef.current = false;
      fn();
    }, DROPDOWN_CLOSE_MS);
  }, []);
}
