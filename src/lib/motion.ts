export const PRESENCE_MS = 200;

const TRANSITION = "duration-200 ease-out";

export const presenceClasses = {
  top: {
    open: `${TRANSITION} animate-in fade-in-0 slide-in-from-top-2`,
    closed: `${TRANSITION} animate-out fade-out-0 slide-out-to-top-2`,
  },
} as const;

export type PresenceVariant = keyof typeof presenceClasses;

export const enterUpClasses =
  "animate-in fade-in-0 slide-in-from-bottom-4 fill-mode-both duration-700 ease-out motion-reduce:animate-none";

export const STAGGER_STEP_MS = 150;
export const ROW_STAGGER_MS = 250;
export const BAR_STAGGER_MS = 60;
export const SYNC_STAGGER_MS = 400;

export function staggerDelay(step: number, stepMs = STAGGER_STEP_MS) {
  return { animationDelay: `${step * stepMs}ms` };
}
