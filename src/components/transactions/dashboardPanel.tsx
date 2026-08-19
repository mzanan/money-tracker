"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useHistoryClose } from "@/hooks/useHistoryClose";
import { cn } from "@/lib/utils";

import {
  DrawerStepContext,
  type DrawerStep,
  type DrawerStepApi,
} from "./drawerStepContext";

export function DashboardPanel({
  title,
  open,
  onClose,
  panelKey,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  panelKey?: string;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [drawerHeight, setDrawerHeight] = useState<number | null>(null);
  const prevPanelKeyRef = useRef(panelKey);
  const prevOpenRef = useRef(open);
  const [steps, setSteps] = useState<DrawerStep[]>([]);
  const stepsRef = useRef(steps);

  const setStepsSynced: typeof setSteps = useCallback((next) => {
    setSteps((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      stepsRef.current = resolved;
      return resolved;
    });
  }, []);

  const backHandlersRef = useRef<Array<() => boolean>>([]);

  const stepApi = useMemo<DrawerStepApi>(
    () => ({
      push: (step) => setStepsSynced((s) => [...s, step]),
      pop: () => setStepsSynced((s) => s.slice(0, -1)),
      registerBack: (handler) => {
        backHandlersRef.current = [...backHandlersRef.current, handler];
        return () => {
          backHandlersRef.current = backHandlersRef.current.filter(
            (h) => h !== handler,
          );
        };
      },
    }),
    [setStepsSynced],
  );

  const handleBack = useCallback(() => {
    if (stepsRef.current.length > 0) {
      setStepsSynced((s) => s.slice(0, -1));
      return true;
    }
    for (const handler of [...backHandlersRef.current].reverse()) {
      if (handler()) return true;
    }
    onClose();
    return false;
  }, [onClose, setStepsSynced]);

  useHistoryClose(open, handleBack);

  useLayoutEffect(() => {
    const panelKeyChanged = prevPanelKeyRef.current !== panelKey;
    const closed = prevOpenRef.current && !open;
    prevPanelKeyRef.current = panelKey;
    prevOpenRef.current = open;
    if (panelKeyChanged) setDrawerHeight(null);
    if (panelKeyChanged || closed) setStepsSynced([]);
  }, [panelKey, open, setStepsSynced]);

  useEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    const header = headerRef.current;
    if (!content) return;
    const recompute = () => {
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      setDrawerHeight(content.scrollHeight + headerHeight);
    };
    const observer = new ResizeObserver(recompute);
    observer.observe(content);
    if (header) observer.observe(header);
    return () => observer.disconnect();
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent
        style={
          drawerHeight
            ? ({ "--drawer-height": `${drawerHeight}px` } as React.CSSProperties)
            : undefined
        }
      >
        <DrawerHeader
          ref={headerRef}
          className={cn("pb-2", steps.length > 0 && "sr-only")}
        >
          <DrawerTitle className="text-eyebrow font-sans">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {title} options
          </DrawerDescription>
        </DrawerHeader>
        <div
          ref={contentRef}
          className={cn(
            "grid gap-5 overflow-y-auto px-4",
            steps.length > 0 ? "pt-4 pb-0" : "pb-8",
          )}
        >
          <DrawerStepContext.Provider value={stepApi}>
            {steps.length > 0 && (
              <div key={steps[steps.length - 1].key}>
                {steps[steps.length - 1].content}
              </div>
            )}
            <div className={steps.length > 0 ? "hidden" : "grid gap-5"}>
              {children}
            </div>
          </DrawerStepContext.Provider>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
