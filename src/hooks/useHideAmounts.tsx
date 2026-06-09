"use client";

import { createContext, useContext, useState } from "react";

import { HIDE_AMOUNTS_COOKIE } from "@/lib/preferences";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

interface Ctx {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
}

const HideAmountsContext = createContext<Ctx | null>(null);

export function HideAmountsProvider({
  initial,
  children,
}: {
  initial: boolean;
  children: React.ReactNode;
}) {
  const [hideAmounts, setHideAmounts] = useState(initial);

  function toggleHideAmounts() {
    setHideAmounts((current) => {
      const next = !current;
      document.cookie = `${HIDE_AMOUNTS_COOKIE}=${next ? "1" : "0"};path=/;max-age=${ONE_YEAR_SECONDS};samesite=lax`;
      return next;
    });
  }

  return (
    <HideAmountsContext.Provider value={{ hideAmounts, toggleHideAmounts }}>
      {children}
    </HideAmountsContext.Provider>
  );
}

export function useHideAmounts(): Ctx {
  const ctx = useContext(HideAmountsContext);
  if (!ctx) {
    throw new Error("useHideAmounts must be used inside HideAmountsProvider");
  }
  return ctx;
}
