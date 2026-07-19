"use client";

import { useEffect, useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { getUsedTags, updateTransactionTags } from "@/lib/actions/transactions";
import { canonicalTag, tagKey } from "@/lib/tags";

const MAX_SUGGESTIONS = 12;

export function useTagEditor(txId: string, tags: string[], open: boolean) {
  const setTags = useServerAction();
  const [input, setInput] = useState("");
  const [usedTags, setUsedTags] = useState<string[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getUsedTags().then((res) => {
      if (!cancelled && res.ok) setUsedTags(res.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const query = tagKey(input);
  const currentKeys = new Set(tags.map(tagKey));
  const suggestions = (usedTags ?? [])
    .filter((tag) => !currentKeys.has(tagKey(tag)))
    .filter((tag) => (query ? tagKey(tag).includes(query) : true))
    .slice(0, MAX_SUGGESTIONS);

  function commit(next: string[]) {
    setTags.run(() => updateTransactionTags(txId, next));
  }

  function addTag(raw: string) {
    const canonical = canonicalTag(raw);
    setInput("");
    if (!canonical) return;
    if (currentKeys.has(tagKey(canonical))) return;
    commit([...tags, canonical]);
  }

  function removeTag(tag: string) {
    commit(tags.filter((t) => t !== tag));
  }

  return { input, setInput, suggestions, addTag, removeTag };
}
