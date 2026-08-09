"use client";

import { useState } from "react";

export function useDialogState(runAfterMenuClose: (fn: () => void) => void) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [key, setKey] = useState(0);

  function openDialog() {
    setMounted(true);
    setKey((k) => k + 1);
    runAfterMenuClose(() => setOpen(true));
  }

  return { open, setOpen, mounted, key, openDialog };
}
