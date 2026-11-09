"use client";

import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ListRow } from "@/components/ui/listRow";
import type { HeldRow } from "@/lib/transactionDisplay";

export function OnHoldDrawer({
  rows,
  mask,
  open,
  onOpenChange,
}: {
  rows: HeldRow[];
  mask: (text: string) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer size="sm" open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>On hold</DrawerTitle>
          <DrawerDescription>
            Deposits and loans. Yours, but out of your balance.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <div className="grid divide-y">
            {rows.map((row) => (
              <ListRow key={row.source} title={row.label} meta={row.meta}>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {mask(row.amount)}
                </span>
              </ListRow>
            ))}
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
