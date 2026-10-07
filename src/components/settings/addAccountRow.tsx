"use client";

import { CheckIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";

import { useAddAccount } from "@/hooks/useAddAccount";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/textAction";

export function AddAccountRow() {
  const { edit, pending } = useAddAccount();

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
    <TextAction
      onClick={() => edit.start("")}
      className="flex gap-2 first:pt-0"
    >
      <PlusIcon className="size-3.5" />
      Add account
    </TextAction>
  );
}
