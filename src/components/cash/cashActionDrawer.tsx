"use client";

import {
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { CashExchangeForm } from "./cashExchangeForm";
import { CashWithdrawalForm } from "./cashWithdrawalForm";
import type { CashAction } from "./useCashActionDrawer";

const TITLES: Record<CashAction, string> = {
  withdraw: "Withdraw cash",
  exchange: "Exchange cash",
};

export function CashActionDrawer({
  open,
  action,
  onClose,
  withdrawalSources,
}: {
  open: boolean;
  action: CashAction;
  onClose: () => void;
  withdrawalSources: string[];
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="sr-only">
          <DrawerTitle>{TITLES[action]}</DrawerTitle>
          <DrawerDescription>Record a cash movement.</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pt-10 pb-8">
          {action === "withdraw" ? (
            <CashWithdrawalForm sources={withdrawalSources} onDone={onClose} />
          ) : (
            <CashExchangeForm onDone={onClose} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
