"use client";

import { Button } from "@/components/ui/button";

export default function Error(
  { reset }: {
    error: Error & { digest?: string };
    reset: () => void;
  },
) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-muted-foreground">Something went wrong</p>
      <Button variant="link" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
