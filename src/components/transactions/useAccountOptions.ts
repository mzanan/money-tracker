"use client";

import { useEffect, useRef, useState } from "react";

import { getTransferAccountOptions } from "@/lib/actions/transfers";

export function useAccountOptions(
  exclude: string,
  active: boolean,
  onLoaded?: (sources: string[]) => void,
) {
  const [sources, setSources] = useState<string[] | null>(null);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  useEffect(() => {
    if (!active) return;
    getTransferAccountOptions(exclude).then((result) => {
      if (!result.ok) return;
      setSources(result.data!.sources);
      onLoadedRef.current?.(result.data!.sources);
    });
  }, [active, exclude]);

  return sources;
}
