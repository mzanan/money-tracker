import type { CsvRow } from "@/lib/actions/csvImport";

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
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left">Date</th>
              <th className="px-2 py-1.5 text-left">Kind</th>
              <th className="px-2 py-1.5 text-right">Amount</th>
              <th className="px-2 py-1.5 text-left">Currency</th>
              <th className="px-2 py-1.5 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1.5">{p.normalized.occurredOn}</td>
                <td className="px-2 py-1.5">{p.normalized.kind}</td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {p.normalized.amount}
                </td>
                <td className="px-2 py-1.5">{p.normalized.currency}</td>
                <td className="max-w-xs truncate px-2 py-1.5">
                  {p.normalized.description ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
