"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { autoSyncIntegrations } from "@/lib/actions/integrations";

const MIN_INTERVAL_MS = 15 * 60 * 1000;

export function AutoSync() {
  const router = useRouter();
  const lastRunRef = useRef(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    async function run() {
      if (inFlightRef.current) return;
      if (Date.now() - lastRunRef.current < MIN_INTERVAL_MS) return;
      inFlightRef.current = true;
      lastRunRef.current = Date.now();
      try {
        const result = await autoSyncIntegrations();
        if (result.ok && result.data && result.data.imported > 0) {
          router.refresh();
        }
      } finally {
        inFlightRef.current = false;
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void run();
    }

    void run();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  return null;
}
