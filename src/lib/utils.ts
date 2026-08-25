import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function navLinkTextClass(active: boolean) {
  return active ? "text-foreground" : "text-muted-foreground hover:text-foreground";
}
