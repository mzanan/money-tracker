"use client";

import { useState } from "react";

export type CashAction = "withdraw" | "exchange";

export function useCashActionDrawer() {
  const [action, setAction] = useState<CashAction | null>(null);
  const [lastAction, setLastAction] = useState<CashAction>("withdraw");

  function open(next: CashAction) {
    setLastAction(next);
    setAction(next);
  }

  return {
    open: action !== null,
    shownAction: action ?? lastAction,
    openWithdraw: () => open("withdraw"),
    openExchange: () => open("exchange"),
    close: () => setAction(null),
  };
}
