import type { ReactNode } from "react";

export function TransactionDetailSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      {children}
    </div>
  );
}
