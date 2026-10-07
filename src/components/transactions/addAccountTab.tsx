"use client";

import { Loader2Icon, PlusIcon } from "lucide-react";
import type { Ref } from "react";

import { useAddAccount } from "@/hooks/useAddAccount";

import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/textAction";

export function AddAccountTab({
  onAdded,
  compact = false,
  labelRef,
}: {
  onAdded: (source: string) => void;
  compact?: boolean;
  labelRef?: Ref<HTMLSpanElement>;
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
          className="w-36 text-sm"
        />
      </div>
    );
  }

  return (
    <TextAction
      aria-label="Add account"
      onClick={() => edit.start("")}
      disabled={pending}
      label="Account"
      compact={compact}
      labelRef={labelRef}
    >
      {pending ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <PlusIcon className="size-3.5" />
      )}
    </TextAction>
  );
}
