"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TagChip } from "@/components/ui/tagChip";

import { useTagEditor } from "./useTagEditor";

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
  const { input, setInput, suggestions, addTag, removeTag } = useTagEditor(
    txId,
    tags,
    open,
  );

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
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestions.map((tag) => (
              <TagChip key={tag} tag={tag} onSelect={() => addTag(tag)} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
