"use client";

import { useEffect, useState } from "react";

import { PRESENCE_MS } from "@/lib/motion";

export type PresenceState = "open" | "closed";

export function usePresence(open: boolean, duration = PRESENCE_MS) {
  const [rendered, setRendered] = useState(open);

  if (open && !rendered) {
    setRendered(true);
  }

  useEffect(() => {
    if (open || !rendered) return;
    const timer = setTimeout(() => setRendered(false), duration);
    return () => clearTimeout(timer);
  }, [open, rendered, duration]);

  return { rendered, state: open ? "open" : "closed" } as const;
}
