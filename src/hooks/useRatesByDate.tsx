"use client";

import { createContext, useContext } from "react";

import type { RatesByDate } from "@/types/ledger";

const RatesByDateContext = createContext<RatesByDate | null>(null);

export function RatesByDateProvider({
  value,
  children,
}: {
  value: RatesByDate;
  children: React.ReactNode;
}) {
  return (
    <RatesByDateContext.Provider value={value}>
      {children}
    </RatesByDateContext.Provider>
  );
}

export function useRatesByDate(): RatesByDate {
  const rates = useContext(RatesByDateContext);
  if (!rates) {
    throw new Error("useRatesByDate must be used inside <RatesByDateProvider>");
  }
  return rates;
}
