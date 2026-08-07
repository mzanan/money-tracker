"use client";

import { CheckIcon, Loader2Icon, MoreVerticalIcon, XIcon } from "lucide-react";

import { deleteSource, renameSource } from "@/lib/actions/sources";
import { kindOfSource, labelForSource } from "@/lib/constants/sources";
import { useDeferredMenuAction } from "@/hooks/useDeferredMenuAction";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useServerAction } from "@/hooks/useServerAction";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/listRow";

interface Props {
  source: string;
  count: number;
}

export function ImportedAccountRow({ source, count }: Props) {
  const { run, pending } = useServerAction();
  const runAfterMenuClose = useDeferredMenuAction();

  const edit = useInlineEdit((next) => {
    if (!next || next === source) return;
    run(() => renameSource(source, next), {
      success: `Renamed to ${labelForSource(next)}`,
    });
  });

  function handleDelete() {
    run(() => deleteSource(source), {
      confirm: `Delete all ${count} transaction${count === 1 ? "" : "s"} from ${labelForSource(source)}? This cannot be undone.`,
      success: (data) => `Deleted ${data?.deleted ?? 0} transactions`,
    });
  }

  if (edit.editing) {
    return (
      <div className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
        <Input
          {...edit.inputProps}
          disabled={pending}
          className="h-8 text-sm"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Save"
          disabled={pending}
          onClick={edit.submit}
        >
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <CheckIcon className="text-income" />
          )}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Cancel"
          disabled={pending}
          onClick={edit.cancel}
        >
          <XIcon />
        </Button>
      </div>
    );
  }

  return (
    <ListRow
      title={labelForSource(source)}
      badge={
        kindOfSource(source) === "api" && (
          <Badge variant="outline" size="xs">
            Synced
          </Badge>
        )
      }
      meta={`${count} transaction${count === 1 ? "" : "s"}`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              aria-label={`${labelForSource(source)} options`}
            >
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <MoreVerticalIcon />
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => edit.start(source)}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => runAfterMenuClose(handleDelete)}
          >
            Delete all
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ListRow>
  );
}
