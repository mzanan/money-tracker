"use client";

import { Loader2Icon } from "lucide-react";

import { labelForSource } from "@/lib/constants/sources";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        {sources === null ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" /> Loading accounts…
          </p>
        ) : sources.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No other account to pick. Import or add one first.
          </p>
        ) : (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {labelForSource(source)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button disabled={!selected || pending} onClick={submit}>
          {pending && <Loader2Icon className="animate-spin" />}
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
