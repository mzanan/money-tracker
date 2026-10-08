import { cookies } from "next/headers";

import { isValidTimezone } from "./dates";
import {
  DAY_TOTALS_ACCOUNT,
  DAY_TOTALS_COOKIE,
  HIDE_AMOUNTS_COOKIE,
  TIMEZONE_COOKIE,
} from "./preferences";

export async function readHideAmountsCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(HIDE_AMOUNTS_COOKIE)?.value === "1";
}

export async function readDayTotalsInAccountCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(DAY_TOTALS_COOKIE)?.value === DAY_TOTALS_ACCOUNT;
}

export async function resolveTimezone(
  saved: string | null | undefined,
): Promise<string> {
  if (saved) return saved;
  const jar = await cookies();
  const device = jar.get(TIMEZONE_COOKIE)?.value;
  return device && isValidTimezone(device) ? device : "UTC";
}
