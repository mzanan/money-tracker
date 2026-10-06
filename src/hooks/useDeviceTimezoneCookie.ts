"use client";

import { useEffect } from "react";

import { getDeviceTimezone } from "@/lib/dates";
import {
  preferenceCookie,
  readBrowserCookie,
  TIMEZONE_COOKIE,
} from "@/lib/preferences";

export function useDeviceTimezoneCookie() {
  useEffect(() => {
    const timezone = getDeviceTimezone();
    if (readBrowserCookie(TIMEZONE_COOKIE) === timezone) return;
    document.cookie = preferenceCookie(TIMEZONE_COOKIE, timezone);
  }, []);
}
