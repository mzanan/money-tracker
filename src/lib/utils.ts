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
