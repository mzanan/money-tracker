"use client";

import { createContext, useContext, type ReactNode } from "react";

export function createStrictContext<T>(name: string) {
  const Context = createContext<T | null>(null);

  function Provider({ value, children }: { value: T; children: ReactNode }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useStrictContext(): T {
    const value = useContext(Context);
    if (value === null) {
      throw new Error(`${name} must be used inside its provider`);
    }
    return value;
  }

  return [Provider, useStrictContext] as const;
}
