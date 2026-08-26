import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

export function TransferBadge({
  children = "Transfer",
}: {
  children?: ReactNode;
}) {
  return (
    <Badge variant="secondary" className="shrink-0">
      {children}
    </Badge>
  );
}
