"use client";

import { createContext, useContext } from "react";

import type { AccountCurrencies } from "@/lib/accountCurrencies";

const AccountCurrenciesContext = createContext<AccountCurrencies | null>(null);

export function AccountCurrenciesProvider({
  value,
  children,
}: {
  value: AccountCurrencies;
  children: React.ReactNode;
}) {
  return (
    <AccountCurrenciesContext.Provider value={value}>
      {children}
    </AccountCurrenciesContext.Provider>
  );
}

export function useAccountCurrencies(): AccountCurrencies {
  const currencies = useContext(AccountCurrenciesContext);
  if (!currencies) {
    throw new Error(
      "useAccountCurrencies must be used inside <AccountCurrenciesProvider>",
    );
  }
  return currencies;
}
