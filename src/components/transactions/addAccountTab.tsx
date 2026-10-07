"use client";

import { Loader2Icon, PlusIcon } from "lucide-react";

import { useAddAccount } from "@/hooks/useAddAccount";

import { Input } from "@/components/ui/input";

import { SourceTabAction } from "./sourceTabAction";

export function AddAccountTab({
  onAdded,
}: {
  onAdded: (source: string) => void;
}) {
  const { edit, pending } = useAddAccount(onAdded);

  if (edit.editing) {
    return (
      <div className="flex shrink-0 items-center py-1.5">
        <Input
          {...edit.inputProps}
          onBlur={edit.cancel}
          placeholder="Account name"
          aria-label="Account name"
          className="h-8 w-36 text-sm"
        />
      </div>
    );
  }

  return (
    <SourceTabAction
      aria-label="Add account"
      onClick={() => edit.start("")}
      disabled={pending}
    >
      {pending ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <PlusIcon className="size-4" />
      )}
    </SourceTabAction>
  );
}
