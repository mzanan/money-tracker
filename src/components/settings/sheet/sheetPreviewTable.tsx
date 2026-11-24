"use client";

import { formatMoney } from "@/lib/currency";
import type { SheetRowCheck } from "@/lib/actions/sheetImport";
import {
  rowCurrency,
  signedAmount,
  type CurrencyMap,
  type ReviewRow,
} from "@/lib/sheetImport/review";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export function SheetPreviewTable({
  rows,
  checks,
  excluded,
  currency,
  currencyMap,
  onToggle,
}: {
  currencyMap: CurrencyMap;
  rows: ReviewRow[];
  checks: SheetRowCheck[] | null;
  excluded: ReadonlySet<number>;
  currency: string;
  onToggle: (index: number) => void;
}) {
  if (!rows.length) return null;
  return (
    <div className="max-h-96 overflow-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted text-muted-foreground sticky top-0">
          <tr>
            <th className="w-8 px-2 py-1.5" />
            <th className="px-2 py-1.5 text-left">Date</th>
            <th className="px-2 py-1.5 text-left">Description</th>
            <th className="px-2 py-1.5 text-right">Amount</th>
            <th className="px-2 py-1.5 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const check = checks?.[index];
            const code = rowCurrency(row, currency, currencyMap);
            const signed = signedAmount(row);
            const match = check?.matches[0];
            return (
              <tr
                key={`${row.sheet}-${row.row}-${row.column}`}
                className="border-t"
              >
                <td className="px-2 py-1.5">
                  <Checkbox
                    checked={!excluded.has(index) && !check?.alreadyImported}
                    disabled={check?.alreadyImported}
                    onCheckedChange={() => onToggle(index)}
                    aria-label={`Import row ${row.row}`}
                  />
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {row.occurredOn}
                </td>
                <td className="max-w-xs truncate px-2 py-1.5">
                  {row.description}
                </td>
                <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">
                  {code ? formatMoney(signed, code) : signed}
                </td>
                <td className="px-2 py-1.5">
                  {check?.alreadyImported ? (
                    <Badge variant="secondary">Already imported</Badge>
                  ) : match ? (
                    <Badge variant="destructive">
                      Possible duplicate: {match.source} {match.occurredOn}
                    </Badge>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
