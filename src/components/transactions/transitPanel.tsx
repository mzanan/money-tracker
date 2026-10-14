"use client";

import { ALL_SOURCES } from "@/lib/constants/sources";
import type { Movement } from "@/types/ledger";

import { TransactionRow } from "./transactionRow";

export function TransitPanel({ movements }: { movements: Movement[] }) {
  return (
    <div className="grid min-w-0 gap-px">
      {movements.map((movement) => (
        <TransactionRow
          key={movement.id}
          movement={movement}
          scope={ALL_SOURCES}
          showDate
        />
      ))}
    </div>
  );
}
