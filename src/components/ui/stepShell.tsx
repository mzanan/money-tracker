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
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  onBack: () => void;
  backAriaLabel?: string;
  footer: ReactNode;
  footerClassName?: string;
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
          <p className="text-sm font-semibold">{title}</p>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
        </div>
      </div>

      {children}

      <div
        className={cn(
          "border-border bg-popover sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t px-4 py-3",
          footerClassName,
        )}
      >
        {footer}
      </div>
    </div>
  );
}
