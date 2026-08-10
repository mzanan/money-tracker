"use client";

import type { ReactNode } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useHistoryClose } from "@/hooks/useHistoryClose";

export function DashboardPanel({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useHistoryClose(open, onClose);

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent className="transition-[transform,opacity,filter]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-eyebrow font-sans">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {title} options
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-5 overflow-y-auto px-4 pb-8">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
