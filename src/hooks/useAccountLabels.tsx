"use client";

import { createContext, useContext } from "react";

import type { AccountLabels } from "@/lib/data/accounts";

const AccountLabelsContext = createContext<AccountLabels | null>(null);

export function AccountLabelsProvider({
  value,
  children,
}: {
  value: AccountLabels;
  children: React.ReactNode;
}) {
  return (
    <AccountLabelsContext.Provider value={value}>
      {children}
    </AccountLabelsContext.Provider>
  );
}

export function useAccountLabels(): AccountLabels {
  const labels = useContext(AccountLabelsContext);
  if (!labels) {
    throw new Error(
      "useAccountLabels must be used inside <AccountLabelsProvider>",
    );
  }
  return labels;
}
