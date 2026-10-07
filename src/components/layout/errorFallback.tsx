"use client";

import { Button } from "@/components/ui/button";

export function ErrorFallback({ retry }: { retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-muted-foreground">Something went wrong</p>
      <Button variant="link" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
