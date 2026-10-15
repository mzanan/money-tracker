import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["card", "inset", "control", "fab"],
      spacing: ["header", "bottom-nav", "consent-gap", "install-hint"],
      animate: ["ticker", "row-in", "bar-grow", "sync-pending", "sync-done"],
    },
    classGroups: {
      "font-size": [{ text: ["micro", "caption", "meta", "eyebrow"] }],
      bottom: [{ bottom: ["fab", "consent"] }],
      "bg-image": [{ bg: ["glow"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function containEscape<E extends { stopPropagation: () => void }>(
  handler?: (event: E) => void,
): (event: E) => void {
  return (event) => {
    event.stopPropagation();
    handler?.(event);
  };
}

export function omitKeys<T extends object, K extends PropertyKey>(
  source: T,
  keys: ReadonlyArray<K>,
): Omit<T, K> {
  const skipped = new Set<PropertyKey>(keys);
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !skipped.has(key)),
  ) as Omit<T, K>;
}
