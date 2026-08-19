"use client";

import { CheckIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";

import { upsertAccountLabel } from "@/lib/actions/accounts";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useServerAction } from "@/hooks/useServerAction";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddAccountRow() {
  const { run, pending } = useServerAction();
  const edit = useInlineEdit((name) => {
    if (!name) return;
    run(() => upsertAccountLabel(name, name), {
      success: `Added ${name}`,
    });
  });

  if (edit.editing) {
    return (
      <div className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
        <Input
          {...edit.inputProps}
          placeholder="Account name"
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
    <button
      type="button"
      onClick={() => edit.start("")}
      className="text-muted-foreground hover:text-foreground flex items-center gap-2 py-3 text-sm font-medium transition-colors first:pt-0"
    >
      <PlusIcon className="size-3.5" />
      Add account
    </button>
  );
}
