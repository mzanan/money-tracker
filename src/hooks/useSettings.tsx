"use client";

import { createContext, useContext } from "react";

import type { UserSettings } from "@/types/db";

import { getDeviceTimezone } from "./useTimezone";

const SettingsContext = createContext<UserSettings | null>(null);

export function SettingsProvider({
  value,
  children,
}: {
  value: UserSettings;
  children: React.ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): UserSettings {
  const settings = useContext(SettingsContext);
  if (!settings) {
    throw new Error("useSettings must be used inside <SettingsProvider>");
  }
  return settings;
}

export function useTimezone(): string {
  const settings = useSettings();
  return settings.timezone ?? getDeviceTimezone();
}
