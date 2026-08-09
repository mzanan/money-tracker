"use client";

import { Loader2Icon } from "lucide-react";

import { AccountSelect } from "./accountSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useSourceEditor } from "./useSourceEditor";

export function SourceEditor({
  txId,
  txSource,
  open,
  onOpenChange,
}: {
  txId: string;
  txSource: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { sources, selected, setSelected, pending, submit } = useSourceEditor({
    txId,
    txSource,
    open,
    onOpenChange,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change account</DialogTitle>
          <DialogDescription>
            Move this transaction to a different account.
          </DialogDescription>
        </DialogHeader>
        <AccountSelect
          sources={sources}
          value={selected}
          onValueChange={setSelected}
          emptyMessage="No other account to pick. Import or add one first."
        />
        <Button disabled={!selected || pending} onClick={submit}>
          {pending && <Loader2Icon className="animate-spin" />}
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
