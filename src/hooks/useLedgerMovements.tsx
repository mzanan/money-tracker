"use client";

import { createContext, useContext } from "react";

import type { Movement } from "@/types/ledger";

const LedgerMovementsContext = createContext<ReadonlyArray<Movement> | null>(
  null,
);

export function LedgerMovementsProvider({
  value,
  children,
}: {
  value: ReadonlyArray<Movement>;
  children: React.ReactNode;
}) {
  return (
    <LedgerMovementsContext.Provider value={value}>
      {children}
    </LedgerMovementsContext.Provider>
  );
}

export function useLedgerMovements(): ReadonlyArray<Movement> {
  const movements = useContext(LedgerMovementsContext);
  if (!movements) {
    throw new Error(
      "useLedgerMovements must be used inside <LedgerMovementsProvider>",
    );
  }
  return movements;
}
