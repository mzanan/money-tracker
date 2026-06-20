"use client";

import { useState } from "react";
import { Loader2Icon, TagIcon, XIcon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { updateTransactionTags } from "@/lib/actions/transactions";
import { canonicalTag, tagHue, tagKey } from "@/lib/tags";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { CSSProperties } from "react";

export function TagEditor({
  txId,
  tags,
  disabled,
  knownTags = [],
}: {
  txId: string;
  tags: string[];
  disabled?: boolean;
  knownTags?: string[];
}) {
  const setTags = useServerAction();
  const [input, setInput] = useState("");
  const hasTags = tags.length > 0;

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
    .slice(0, 10);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={disabled || setTags.pending}
          aria-label={hasTags ? "Edit tags" : "Add tags"}
          className={cn(
            "hover:text-foreground -mr-0.5",
            hasTags ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {setTags.pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <TagIcon />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        {hasTags && (
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
          className="h-9"
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
      </PopoverContent>
    </Popover>
  );
}
