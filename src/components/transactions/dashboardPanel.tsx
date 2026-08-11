"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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

  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [drawerHeight, setDrawerHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(([entry]) => {
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      setDrawerHeight(entry.target.scrollHeight + headerHeight);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent
        className="transition-[transform,opacity,filter]"
        style={
          drawerHeight
            ? ({ "--drawer-height": `${drawerHeight}px` } as React.CSSProperties)
            : undefined
        }
      >
        <DrawerHeader ref={headerRef} className="pb-2">
          <DrawerTitle className="text-eyebrow font-sans">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {title} options
          </DrawerDescription>
        </DrawerHeader>
        <div
          ref={contentRef}
          className="grid gap-5 overflow-y-auto px-4 pb-8"
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
