"use client";

import { useMemo } from "react";

import { heldSourceSet, type HeldAccounts } from "@/lib/accountPurpose";

import { createStrictContext } from "./createStrictContext";

const [HeldAccountsProvider, useHeldAccounts] =
  createStrictContext<HeldAccounts>("useHeldAccounts");

export { HeldAccountsProvider, useHeldAccounts };

export function useHeldSources(): ReadonlySet<string> {
  const held = useHeldAccounts();
  return useMemo(() => heldSourceSet(held), [held]);
}
