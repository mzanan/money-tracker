"use client";

import type { AccountCurrencies } from "@/lib/accountCurrencies";

import { createStrictContext } from "./createStrictContext";

const [AccountCurrenciesProvider, useAccountCurrencies] =
  createStrictContext<AccountCurrencies>("useAccountCurrencies");

export { AccountCurrenciesProvider, useAccountCurrencies };
