"use client";

import { CheckIcon, Loader2Icon, MoreVerticalIcon, XIcon } from "lucide-react";

import { removeAccount, upsertAccountLabel } from "@/lib/actions/accounts";
import { deleteSource } from "@/lib/actions/sources";
import { kindOfSource } from "@/lib/constants/sources";
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
  label: string;
  count: number;
  hasAccount: boolean;
}

export function ImportedAccountRow({
  source,
  label,
  count,
  hasAccount,
}: Props) {
  const { run, pending } = useServerAction();
  const runAfterMenuClose = useDeferredMenuAction();
  const reserved = kindOfSource(source) !== "csv";

  const edit = useInlineEdit((next) => {
    if (!next || next === label) return;
    run(() => upsertAccountLabel(source, next), {
      success: `Renamed to ${next}`,
    });
  });

  function handleRemoveAccount() {
    run(() => removeAccount(source), {
      confirm:
        count > 0
          ? `Remove the "${label}" label? Transactions are kept, the name falls back to a default.`
          : undefined,
      success: "Account removed",
    });
  }

  function handleDeleteAll() {
    run(() => deleteSource(source), {
      confirm: `Delete all ${count} transaction${count === 1 ? "" : "s"} from ${label}? This cannot be undone.`,
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
      title={label}
      badge={
        kindOfSource(source) === "api" && (
          <Badge variant="outline" size="xs">
            Synced
          </Badge>
        )
      }
      meta={
        count > 0
          ? `${count} transaction${count === 1 ? "" : "s"}`
          : "No transactions yet"
      }
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              aria-label={`${label} options`}
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
          {!reserved && (
            <DropdownMenuItem onSelect={() => edit.start(label)}>
              Rename
            </DropdownMenuItem>
          )}
          {!reserved && hasAccount && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => runAfterMenuClose(handleRemoveAccount)}
            >
              Remove account
            </DropdownMenuItem>
          )}
          {count > 0 && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => runAfterMenuClose(handleDeleteAll)}
            >
              Delete all transactions
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </ListRow>
  );
}
