"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { updateTransactionTags } from "@/lib/actions/transactions";
import { canonicalTag, tagHue, tagKey } from "@/lib/tags";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import type { CSSProperties } from "react";

export function TagEditor({
  txId,
  tags,
  knownTags = [],
  open,
  onOpenChange,
}: {
  txId: string;
  tags: string[];
  knownTags?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setTags = useServerAction();
  const [input, setInput] = useState("");

  function commit(next: string[]) {
    setTags.run(() => updateTransactionTags(txId, next));
  }

  function addTag(raw: string) {
    const canonical = canonicalTag(raw);
    setInput("");
    if (!canonical) return;
    const key = tagKey(canonical);
    if (tags.some((t) => tagKey(t) === key)) return;
    commit([...tags, canonical]);
  }

  function removeTag(tag: string) {
    commit(tags.filter((t) => t !== tag));
  }

  const suggestions = knownTags
    .filter((t) => !tags.some((x) => tagKey(x) === tagKey(t)))
    .slice(0, 12);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tags</DialogTitle>
          <DialogDescription className="sr-only">
            Add or remove tags for this transaction.
          </DialogDescription>
        </DialogHeader>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => removeTag(tag)}
                style={{ "--tag-h": tagHue(tag) } as CSSProperties}
                className="tag-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              >
                {tag}
                <XIcon className="size-3 opacity-60" />
              </button>
            ))}
          </div>
        )}
        <Input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(input);
            }
          }}
          placeholder="Add a tag…"
          maxLength={40}
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                style={{ "--tag-h": tagHue(tag) } as CSSProperties}
                className="tag-chip inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium opacity-60 hover:opacity-100"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
