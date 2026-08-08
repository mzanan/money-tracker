export const PRESENCE_MS = 200;

const TRANSITION = "duration-200 ease-out";

export const presenceClasses = {
  top: {
    open: `${TRANSITION} animate-in fade-in-0 slide-in-from-top-2`,
    closed: `${TRANSITION} animate-out fade-out-0 slide-out-to-top-2`,
  },
} as const;

export type PresenceVariant = keyof typeof presenceClasses;
