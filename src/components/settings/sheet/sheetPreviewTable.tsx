"use client";

import { formatMoney } from "@/lib/currency";
import { rowCurrency, type CurrencyMap } from "@/lib/sheetImport/currency";
import type { SheetRowCheck } from "@/lib/sheetImport/check";
import {
  duplicateLabel,
  signedAmount,
  type ReviewRow,
} from "@/lib/sheetImport/review";
import { isRowLocked, isRowSelected } from "@/lib/sheetImport/selection";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SheetPreviewTable({
  rows,
  checks,
  toggled,
  currency,
  currencyMap,
  onToggle,
}: {
  currencyMap: CurrencyMap;
  rows: ReviewRow[];
  checks: SheetRowCheck[] | null;
  toggled: ReadonlySet<number>;
  currency: string;
  onToggle: (index: number) => void;
}) {
  if (!rows.length) return null;
  return (
    <Table containerClassName="max-h-96 overflow-auto">
      <TableHeader className="sticky top-0">
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const check = checks?.[index];
          const code = rowCurrency(row, currency, currencyMap);
          const signed = signedAmount(row);
          const match = check?.match;
          return (
            <TableRow key={`${row.sheet}-${row.row}-${row.column}`}>
              <TableCell>
                <Checkbox
                  checked={isRowSelected(index, check, toggled)}
                  disabled={!check || isRowLocked(check)}
                  onCheckedChange={() => onToggle(index)}
                  aria-label={`Import row ${row.row}`}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {row.occurredOn}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {row.description}
              </TableCell>
              <TableCell className="text-right font-mono whitespace-nowrap">
                {code ? formatMoney(signed, code) : signed}
              </TableCell>
              <TableCell>
                {isRowLocked(check) ? (
                  <Badge variant="secondary">Already imported</Badge>
                ) : match ? (
                  <Badge
                    variant="outline"
                    title="Tick the row to import it anyway"
                  >
                    Already in your records: {duplicateLabel(match)}
                  </Badge>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
