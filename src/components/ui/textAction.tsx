import type { ComponentProps, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

export function TextAction({
  className,
  children,
  label,
  compact = false,
  labelRef,
  ...props
}: ComponentProps<"button"> & {
  label?: ReactNode;
  compact?: boolean;
  labelRef?: Ref<HTMLSpanElement>;
}) {
  return (
    <button
      type="button"
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 py-3 text-sm font-medium transition-colors disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {label !== undefined && (
        <span ref={labelRef} className={cn(compact && "sr-only")}>
          {label}
        </span>
      )}
    </button>
  );
}
