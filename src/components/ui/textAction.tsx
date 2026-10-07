import type { ComponentProps, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

export function TextAction({
  className,
  children,
  label,
  compact = false,
  labelRef,
  size = "default",
  ...props
}: ComponentProps<"button"> & {
  size?: "default" | "xs";
  label?: ReactNode;
  compact?: boolean;
  labelRef?: Ref<HTMLSpanElement>;
}) {
  return (
    <button
      type="button"
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 font-medium transition-colors disabled:opacity-50",
        size === "xs" ? "text-xs" : "py-3 text-sm",
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
