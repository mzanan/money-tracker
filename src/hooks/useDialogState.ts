"use client";

import { useState } from "react";

export function useDialogState(runAfterMenuClose: (fn: () => void) => void) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [key, setKey] = useState(0);

  function mountFresh() {
    setMounted(true);
    setKey((k) => k + 1);
  }

  function openDialog() {
    mountFresh();
    runAfterMenuClose(() => setOpen(true));
  }

  function openNow() {
    mountFresh();
    setOpen(true);
  }

  return { open, setOpen, mounted, key, openDialog, openNow };
}
