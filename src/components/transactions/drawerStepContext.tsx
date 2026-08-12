"use client";

import { createContext, useContext, type ReactNode } from "react";

export type DrawerStep = {
  key: string;
  content: ReactNode;
};

export type DrawerStepApi = {
  push: (step: DrawerStep) => void;
  pop: () => void;
  registerBack: (handler: () => boolean) => () => void;
};

export const DrawerStepContext = createContext<DrawerStepApi | null>(null);

export function useDrawerStep() {
  return useContext(DrawerStepContext);
}
