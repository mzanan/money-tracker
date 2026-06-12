"use client";

import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useHistoryClose } from "@/hooks/useHistoryClose";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const open = state === "open";
  useHistoryClose(isMobile && open, onClose);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-eyebrow font-sans">
              {title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-5 overflow-y-auto px-4 pb-8">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className={cn(presenceClasses.panel[state])}>
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
