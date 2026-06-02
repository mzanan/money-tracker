"use client";

import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { presenceClasses } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { PresenceState } from "@/hooks/usePresence";

export function DashboardPanel({
  title,
  state,
  onClose,
  children,
}: {
  title: string;
  state: PresenceState;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-background fixed inset-0 z-50 overflow-y-auto p-4 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0",
        presenceClasses.panel[state],
      )}
    >
      <div className="grid gap-5 lg:sticky lg:top-20">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-eyebrow">{title}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close panel"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
