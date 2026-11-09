import type { DetailRow } from "@/lib/transactionDetail";
import { cn } from "@/lib/utils";

export function TransactionDetailRows({
  rows,
  mask,
  strong = false,
}: {
  rows: DetailRow[];
  mask: (text: string) => string;
  strong?: boolean;
}) {
  return (
    <dl className="grid gap-2.5">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start justify-between gap-4">
          <dt className="min-w-0 text-sm">
            {row.label}
            {row.meta && (
              <span className="text-muted-foreground block text-xs">
                {row.meta}
              </span>
            )}
          </dt>
          <dd
            className={cn(
              "shrink-0 text-right text-sm tabular-nums",
              strong && "font-semibold",
            )}
          >
            {row.isAmount ? mask(row.value) : row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
