import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function TextAction({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 py-3 text-sm font-medium transition-colors disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
