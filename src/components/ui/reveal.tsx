"use client";

import type { ReactNode } from "react";

import { usePresence } from "@/hooks/usePresence";
import { presenceClasses, type PresenceVariant } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Reveal({
  open,
  variant = "top",
  className,
  children,
}: {
  open: boolean;
  variant?: PresenceVariant;
  className?: string;
  children: ReactNode;
}) {
  const { rendered, state } = usePresence(open);

  if (!rendered) return null;

  return (
    <div className={cn(presenceClasses[variant][state], className)}>
      {children}
    </div>
  );
}
