"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmFn = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  return confirm ?? ((message) => Promise.resolve(window.confirm(message)));
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const resolveRef = useRef<(value: boolean) => void>(null);

  function confirm(next: string): Promise<boolean> {
    resolveRef.current?.(false);
    setMessage(next);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }

  function settle(value: boolean) {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setMessage(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={message !== null}
        onOpenChange={(open) => !open && settle(false)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => settle(false)}>
              Cancel
            </Button>
            <Button onClick={() => settle(true)}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
