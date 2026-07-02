"use client";

export default function Error(
  { reset }: {
    error: Error & { digest?: string };
    reset: () => void;
  },
) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-muted-foreground">Something went wrong</p>
      <button
        onClick={reset}
        className="text-sm text-primary underline underline-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
