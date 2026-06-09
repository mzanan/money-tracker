import { cookies } from "next/headers";

import { HIDE_AMOUNTS_COOKIE } from "./preferences";

export async function readHideAmountsCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(HIDE_AMOUNTS_COOKIE)?.value === "1";
}
