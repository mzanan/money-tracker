"use client";

import { useState } from "react";

import type { CashAction } from "./cashActionDrawer";

export function useCashActionDrawer() {
  const [action, setAction] = useState<CashAction | null>(null);
  return {
    action,
    openWithdraw: () => setAction("withdraw"),
    openExchange: () => setAction("exchange"),
    close: () => setAction(null),
  };
}
