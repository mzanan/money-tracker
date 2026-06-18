"use client";

import { CheckIcon, Loader2Icon, TagIcon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { updateTransactionTags } from "@/lib/actions/transactions";
import { SUGGESTED_TAGS } from "@/lib/constants/tags";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TagEditor({
  txId,
  tags,
  disabled,
}: {
  txId: string;
  tags: string[];
  disabled?: boolean;
}) {
  const setTags = useServerAction();
  const allTags = [
    ...SUGGESTED_TAGS,
    ...tags.filter(
      (tag) => !SUGGESTED_TAGS.includes(tag as (typeof SUGGESTED_TAGS)[number]),
    ),
  ];
  const hasTags = tags.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {allTags.map((tag) => {
          const active = tags.includes(tag);
          return (
            <DropdownMenuItem
              key={tag}
              onClick={() =>
                setTags.run(
                  () =>
                    updateTransactionTags(
                      txId,
                      active ? tags.filter((t) => t !== tag) : [...tags, tag],
                    ),
                  { success: active ? `Removed ${tag}` : `Tagged ${tag}` },
                )
              }
              className={cn(active && "font-semibold")}
            >
              {active && <CheckIcon className="size-3.5" />}
              {tag}
            </DropdownMenuItem>
          );
        })}
        {hasTags && (
          <DropdownMenuItem
            onClick={() =>
              setTags.run(() => updateTransactionTags(txId, []), {
                success: "Tags cleared",
              })
            }
            className="text-muted-foreground"
          >
            Clear tags
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
