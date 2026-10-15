"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import { getUsedTags } from "@/lib/actions/transactions";
import {
  dedupeTags,
  MAX_TAGS_PER_TRANSACTION,
  mergeTagInput,
  parseTagsInput,
  tagKey,
} from "@/lib/tags";

const MAX_TAG_SUGGESTIONS = 12;
const MAX_TAGS_MESSAGE = `Max ${MAX_TAGS_PER_TRANSACTION} tags`;

export function useTagPicker({
  open,
  tags,
  setTags,
}: {
  open: boolean;
  tags: string[];
  setTags: Dispatch<SetStateAction<string[]>>;
}) {
  const [tagInput, setTagInput] = useState("");
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

  const currentTagKeys = new Set(tags.map(tagKey));
  const tagLimitReached = tags.length >= MAX_TAGS_PER_TRANSACTION;
  const query = tagKey(tagInput);
  const tagSuggestions = tagLimitReached
    ? []
    : (usedTags ?? [])
        .filter((tag) => !currentTagKeys.has(tagKey(tag)))
        .filter((tag) => (query ? tagKey(tag).includes(query) : true))
        .slice(0, MAX_TAG_SUGGESTIONS);

  function addTag(raw: string) {
    if (tagLimitReached) {
      toast.error(MAX_TAGS_MESSAGE);
      return;
    }
    setTagInput("");
    if (dedupeTags(parseTagsInput(raw)).length === 0) return;
    if (mergeTagInput(tags, raw).overflow) toast.error(MAX_TAGS_MESSAGE);
    setTags((prev) => mergeTagInput(prev, raw).tags);
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  return {
    tagInput,
    setTagInput,
    tagSuggestions,
    tagLimitReached,
    addTag,
    removeTag,
  };
}
