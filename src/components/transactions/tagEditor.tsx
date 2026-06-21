"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { updateTransactionTags } from "@/lib/actions/transactions";
import { canonicalTag, tagKey } from "@/lib/tags";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TagChip } from "@/components/ui/tagChip";

export function TagEditor({
  txId,
  tags,
  open,
  onOpenChange,
}: {
  txId: string;
  tags: string[];
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
              <TagChip key={tag} tag={tag} onRemove={() => removeTag(tag)} />
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
      </DialogContent>
    </Dialog>
  );
}
