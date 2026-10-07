export const HIDE_AMOUNTS_COOKIE = "mt_hide_amounts";
export const TIMEZONE_COOKIE = "mt_tz";

export const HIDDEN_AMOUNT = "••••";

export function maskAmount(text: string, hidden: boolean): string {
  return hidden ? HIDDEN_AMOUNT : text;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readBrowserCookie(name: string): string | null {
  const entry = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

export function preferenceCookie(name: string, value: string): string {
  return `${name}=${encodeURIComponent(value)};path=/;max-age=${ONE_YEAR_SECONDS};samesite=lax`;
}
