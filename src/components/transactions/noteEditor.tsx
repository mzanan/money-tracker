"use client";

import { useState } from "react";

import { useServerAction } from "@/hooks/useServerAction";
import { updateTransactionNote } from "@/lib/actions/transactions";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function NoteEditor({
  txId,
  note,
  open,
  onOpenChange,
}: {
  txId: string;
  note: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useServerAction();
  const [value, setValue] = useState(note ?? "");

  function submit() {
    save.run(() => updateTransactionNote(txId, value), {
      success: "Description saved",
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Description</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the description for this transaction.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a description…"
          maxLength={280}
        />
        <DialogFooter>
          <Button onClick={submit} disabled={save.pending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
