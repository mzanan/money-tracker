"use client";

import { useId, useState } from "react";

import { defaultAddSource } from "@/lib/constants/sources";

export function useAddEntryPanel({
  addSources,
  selectedSource,
}: {
  addSources: string[];
  selectedSource: string;
}) {
  const accountId = useId();
  const [picked, setPicked] = useState<string | null>(null);

  const source =
    picked && addSources.includes(picked)
      ? picked
      : defaultAddSource(selectedSource, addSources);

  return { accountId, source, setSource: setPicked };
}
