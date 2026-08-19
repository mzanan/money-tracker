import type { ReactNode } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

export function StepShell({
  title,
  description,
  onBack,
  backAriaLabel,
  footer,
  footerClassName,
  insetClassName = "-mx-4 px-4",
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  onBack: () => void;
  backAriaLabel?: string;
  footer: ReactNode;
  footerClassName?: string;
  insetClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={backAriaLabel ?? "Back"}
          onClick={onBack}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0 pt-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
        </div>
      </div>

      {children}

      <div
        className={cn(
          "border-border bg-popover sticky bottom-0 z-10 flex justify-end gap-2 border-t py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
          insetClassName,
          footerClassName,
        )}
      >
        {footer}
      </div>
    </div>
  );
}
