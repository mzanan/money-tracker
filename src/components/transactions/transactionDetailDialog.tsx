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
import type { Movement } from "@/types/ledger";

import copy from "./transactionDetail.json";
import { TransactionDetailBody } from "./transactionDetailBody";
import { useTransactionDetail } from "./useTransactionDetail";

export function TransactionDetailDialog({
  movement,
  open,
  onOpenChange,
}: {
  movement: Movement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { detail, mask } = useTransactionDetail(movement);

  return (
    <Drawer size="sm" open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>{detail.date}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <TransactionDetailBody detail={detail} mask={mask} />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
