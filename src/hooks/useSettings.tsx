"use client";

import { getDeviceTimezone } from "@/lib/dates";

import { createStrictContext } from "./createStrictContext";
import { useDeviceTimezoneCookie } from "./useDeviceTimezoneCookie";

import type { ClientSettings } from "@/types/db";

const [SettingsValueProvider, useSettings] =
  createStrictContext<ClientSettings>("useSettings");

export { useSettings };

export function SettingsProvider({
  value,
  children,
}: {
  value: ClientSettings;
  children: React.ReactNode;
}) {
  useDeviceTimezoneCookie();
  return (
    <SettingsValueProvider value={value}>{children}</SettingsValueProvider>
  );
}

export function useTimezone(): string {
  const settings = useSettings();
  return settings.timezone ?? getDeviceTimezone();
}
