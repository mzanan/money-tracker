import { Badge } from "@/components/ui/badge";
import { formatMonthShort } from "@/lib/dates";

export function BudgetMonthBadge({ occurredOn }: { occurredOn: string }) {
  return (
    <Badge variant="secondary" className="shrink-0">
      From {formatMonthShort(occurredOn.slice(0, 7))}
    </Badge>
  );
}
