import { cn } from "@/lib/utils";

export function ErrorText({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p role="alert" className={cn("text-destructive text-xs", className)}>
      {children}
    </p>
  );
}
