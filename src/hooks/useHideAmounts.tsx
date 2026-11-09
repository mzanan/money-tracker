"use client";

import { useState } from "react";

import {
  HIDE_AMOUNTS_COOKIE,
  maskAmount,
  preferenceCookie,
} from "@/lib/preferences";

import { createStrictContext } from "./createStrictContext";

interface Ctx {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  mask: (text: string) => string;
}

const [HideAmountsContextProvider, useHideAmounts] =
  createStrictContext<Ctx>("useHideAmounts");

export { useHideAmounts };

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
    <HideAmountsContextProvider
      value={{ hideAmounts, toggleHideAmounts, mask }}
    >
      {children}
    </HideAmountsContextProvider>
  );
}
