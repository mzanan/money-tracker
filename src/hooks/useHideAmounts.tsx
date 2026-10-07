"use client";

import { createContext, useContext, useState } from "react";

import {
  HIDE_AMOUNTS_COOKIE,
  maskAmount,
  preferenceCookie,
} from "@/lib/preferences";

interface Ctx {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  mask: (text: string) => string;
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
      document.cookie = preferenceCookie(HIDE_AMOUNTS_COOKIE, next ? "1" : "0");
      return next;
    });
  }

  function mask(text: string) {
    return maskAmount(text, hideAmounts);
  }

  return (
    <HideAmountsContext.Provider
      value={{ hideAmounts, toggleHideAmounts, mask }}
    >
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
