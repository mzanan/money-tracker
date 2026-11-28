import { Spinner } from "@/components/ui/spinner";

export function LoadingText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      <Spinner />
      {children}
    </p>
  );
}
