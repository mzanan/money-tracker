"use client";

import { ShareIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

import { useInstallHint } from "./useInstallHint";

export function InstallHint() {
  const { show, isAndroid, install, close } = useInstallHint();

  if (!show) return null;

  return (
    <Surface
      radius="lg"
      padding="sm"
      className="fixed right-3 bottom-3 left-3 z-40 flex items-center gap-3 border shadow-lg sm:right-auto sm:left-3 sm:max-w-sm"
    >
      <div className="flex-1 text-sm">
        {isAndroid ? (
          <p>
            <span className="font-medium">Install Money Tracker</span> for
            faster access from your home screen.
          </p>
        ) : (
          <p className="flex items-center gap-1.5">
            <span className="font-medium">Add to Home Screen</span>
            <span className="text-muted-foreground">: tap</span>
            <ShareIcon className="text-muted-foreground inline size-3.5" />
            <span className="text-muted-foreground">
              then “Add to Home Screen”.
            </span>
          </p>
        )}
      </div>
      {isAndroid && (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={close} aria-label="Dismiss">
        <XIcon className="size-4" />
      </Button>
    </Surface>
  );
}
