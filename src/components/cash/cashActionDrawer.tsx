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

export type CashAction = "withdraw" | "exchange";

const TITLES: Record<CashAction, string> = {
  withdraw: "Withdraw cash",
  exchange: "Exchange cash",
};

export function CashActionDrawer({
  action,
  onClose,
  withdrawalSources,
}: {
  action: CashAction | null;
  onClose: () => void;
  withdrawalSources: string[];
}) {
  return (
    <Drawer
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="sr-only">
          <DrawerTitle>{action ? TITLES[action] : ""}</DrawerTitle>
          <DrawerDescription>Record a cash movement.</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pt-10 pb-8">
          {action === "withdraw" && (
            <CashWithdrawalForm sources={withdrawalSources} onDone={onClose} />
          )}
          {action === "exchange" && <CashExchangeForm onDone={onClose} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
