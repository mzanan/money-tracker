import { Badge } from "@/components/ui/badge";
import { formatMonthShort } from "@/lib/dates";

export function BudgetMonthBadge({
  direction,
  yearMonth,
}: {
  direction: "from" | "to";
  yearMonth: string;
}) {
  return (
    <Badge variant="secondary" className="shrink-0">
      {direction === "from" ? "From" : "Moved to"}{" "}
      {formatMonthShort(yearMonth)}
    </Badge>
  );
}
