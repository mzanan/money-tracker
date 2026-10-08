"use client";

import { createContext, useContext, useState } from "react";

import {
  DAY_TOTALS_ACCOUNT,
  DAY_TOTALS_BASE,
  DAY_TOTALS_COOKIE,
  preferenceCookie,
  readBrowserCookie,
} from "@/lib/preferences";

interface Ctx {
  dayTotalsInAccount: boolean;
  setDayTotalsInAccount: (next: boolean) => void;
}

const DayTotalsContext = createContext<Ctx | null>(null);

export function DayTotalsInAccountProvider({
  initial,
  children,
}: {
  initial: boolean;
  children: React.ReactNode;
}) {
  const [dayTotalsInAccount, setState] = useState(() =>
    typeof document === "undefined"
      ? initial
      : readBrowserCookie(DAY_TOTALS_COOKIE) === DAY_TOTALS_ACCOUNT,
  );

  function setDayTotalsInAccount(next: boolean) {
    setState(next);
    document.cookie = preferenceCookie(
      DAY_TOTALS_COOKIE,
      next ? DAY_TOTALS_ACCOUNT : DAY_TOTALS_BASE,
    );
  }

  return (
    <DayTotalsContext.Provider
      value={{ dayTotalsInAccount, setDayTotalsInAccount }}
    >
      {children}
    </DayTotalsContext.Provider>
  );
}

export function useDayTotalsInAccount(): Ctx {
  const ctx = useContext(DayTotalsContext);
  if (!ctx) {
    throw new Error(
      "useDayTotalsInAccount must be used inside DayTotalsInAccountProvider",
    );
  }
  return ctx;
}
