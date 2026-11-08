"use client";

import { createContext, useContext, useMemo } from "react";

import { heldSourceSet, type HeldAccounts } from "@/lib/accountPurpose";

const HeldAccountsContext = createContext<HeldAccounts | null>(null);

export function HeldAccountsProvider({
  value,
  children,
}: {
  value: HeldAccounts;
  children: React.ReactNode;
}) {
  return (
    <HeldAccountsContext.Provider value={value}>
      {children}
    </HeldAccountsContext.Provider>
  );
}

export function useHeldAccounts(): HeldAccounts {
  const held = useContext(HeldAccountsContext);
  if (!held) {
    throw new Error(
      "useHeldAccounts must be used inside <HeldAccountsProvider>",
    );
  }
  return held;
}

export function useHeldSources(): ReadonlySet<string> {
  const held = useHeldAccounts();
  return useMemo(() => heldSourceSet(held), [held]);
}
