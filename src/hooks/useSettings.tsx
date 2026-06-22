"use client";

import { createContext, useContext } from "react";

import { getDeviceTimezone } from "@/lib/dates";

import type { ClientSettings } from "@/types/db";

const SettingsContext = createContext<ClientSettings | null>(null);

export function SettingsProvider({
  value,
  children,
}: {
  value: ClientSettings;
  children: React.ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): ClientSettings {
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
