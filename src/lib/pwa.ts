export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const DISMISS_KEY = "pwa:installHintDismissed";
export const DISMISS_EVENT = "pwa:installHintDismissed";
export const AUTO_HIDE_MS = 10_000;

export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  type NavigatorWithStandalone = Navigator & { standalone?: boolean };
  return (window.navigator as NavigatorWithStandalone).standalone === true;
}

export function subscribeDismiss(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DISMISS_EVENT, callback);
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}

export function getIosSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalone()) return false;
  if (localStorage.getItem(DISMISS_KEY) === "1") return false;
  return isIos();
}

export function getIosServerSnapshot(): boolean {
  return false;
}

export function markInstallHintDismissed(): void {
  localStorage.setItem(DISMISS_KEY, "1");
  window.dispatchEvent(new Event(DISMISS_EVENT));
}
