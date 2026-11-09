"use client";


import { AccountSelect } from "./accountSelect";
import { DrawerActions } from "@/components/ui/drawerActions";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>Change account</DrawerTitle>
          <DrawerDescription>
            Move this transaction to a different account.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <AccountSelect
            sources={sources}
            value={selected}
            onValueChange={setSelected}
            emptyMessage="No other account to pick. Import or add one first."
          />
        </DrawerBody>
        <DrawerActions
          onCancel={() => onOpenChange(false)}
          onSubmit={submit}
          submitLabel="Save"
          pending={pending}
          disabled={!selected}
        />
      </DrawerContent>
    </Drawer>
  );
}
