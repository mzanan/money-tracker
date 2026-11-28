import type { CsvRow } from "@/lib/csv/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PreviewTable({
  rows,
  okCount,
  cutoffCount,
}: {
  rows: Array<{ raw: Record<string, string>; normalized: CsvRow }>;
  okCount: number;
  cutoffCount: number;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium">
        Preview ({okCount} to import
        {cutoffCount > 0 ? ` · ${cutoffCount} before cutoff` : ""})
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p, i) => (
            <TableRow key={i}>
              <TableCell>{p.normalized.occurredOn}</TableCell>
              <TableCell>{p.normalized.kind}</TableCell>
              <TableCell className="text-right font-mono">
                {p.normalized.amount}
              </TableCell>
              <TableCell>{p.normalized.currency}</TableCell>
              <TableCell className="max-w-xs truncate">
                {p.normalized.description ?? ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
