import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function IconCircle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        className,
      )}
    >
      {children}
    </span>
  );
}
