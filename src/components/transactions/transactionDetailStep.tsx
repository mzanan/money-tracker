"use client";

import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/ui/stepShell";
import type { Movement } from "@/types/ledger";

import copy from "./transactionDetail.json";
import { TransactionDetailBody } from "./transactionDetailBody";
import { useTransactionDetail } from "./useTransactionDetail";

export function TransactionDetailStep({
  movement,
  onBack,
}: {
  movement: Movement;
  onBack: () => void;
}) {
  const { detail, mask } = useTransactionDetail(movement);

  return (
    <StepShell
      title={copy.title}
      description={detail.date}
      onBack={onBack}
      footer={
        <Button variant="ghost" onClick={onBack}>
          {copy.close}
        </Button>
      }
    >
      <TransactionDetailBody detail={detail} mask={mask} />
    </StepShell>
  );
}
