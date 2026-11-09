"use client";

import { useState } from "react";

import {
  DAY_TOTALS_ACCOUNT,
  DAY_TOTALS_BASE,
  DAY_TOTALS_COOKIE,
  preferenceCookie,
  readBrowserCookie,
} from "@/lib/preferences";

import { createStrictContext } from "./createStrictContext";

interface Ctx {
  dayTotalsInAccount: boolean;
  setDayTotalsInAccount: (next: boolean) => void;
}

const [DayTotalsContextProvider, useDayTotalsInAccount] =
  createStrictContext<Ctx>("useDayTotalsInAccount");

export { useDayTotalsInAccount };

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
    <DayTotalsContextProvider
      value={{ dayTotalsInAccount, setDayTotalsInAccount }}
    >
      {children}
    </DayTotalsContextProvider>
  );
}
