"use client";

import { columnOptions } from "@/lib/sheetImport/columns";
import {
  DATE_ORDER_OPTIONS,
  DECIMAL_OPTIONS,
  EXPENSE_SIGN_OPTIONS,
  NO_COLUMN,
} from "@/lib/constants/sheetImport";
import {
  withAmount,
  withDate,
  withDecimal,
  withDescription,
  withFirstRow,
} from "@/lib/sheetImport/corrections";
import type {
  DateSpec,
  NumberFormat,
  TableRecipe,
} from "@/lib/sheetImport/recipe";
import type { SheetGrid } from "@/lib/sheetImport/workbook";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeledSelect";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switchRow";

export function TableCorrections({
  index,
  table,
  grid,
  onChange,
}: {
  index: number;
  table: TableRecipe;
  grid: SheetGrid;
  onChange: (patch: Partial<TableRecipe>) => void;
}) {
  const columns = columnOptions(grid, table.firstDataRow);
  const amount = table.amount;
  return (
    <Surface tone="outline" padding="xs" className="grid gap-3">
      <SwitchRow
        id={`sheet-table-${index}`}
        label={`Tab "${table.sheet}"`}
        checked={table.import}
        onCheckedChange={(checked) => onChange({ import: checked })}
      />
      {table.import && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`sheet-first-row-${index}`}>
              First row with data
            </Label>
            <Input
              id={`sheet-first-row-${index}`}
              type="number"
              min={1}
              value={table.firstDataRow}
              onChange={(event) => {
                const patch = withFirstRow(event.target.value);
                if (patch) onChange(patch);
              }}
            />
          </div>
          <LabeledSelect
            label="Date column"
            value={table.date.column}
            options={columns}
            onChange={(column) => onChange(withDate(table, { column }))}
          />
          <LabeledSelect
            label="Dates are written"
            value={table.date.order}
            options={DATE_ORDER_OPTIONS}
            onChange={(order) =>
              onChange(withDate(table, { order: order as DateSpec["order"] }))
            }
          />
          <LabeledSelect
            label="Decimal separator"
            value={table.numberFormat.decimal}
            options={DECIMAL_OPTIONS}
            onChange={(decimal) =>
              onChange({
                numberFormat: withDecimal(
                  table.numberFormat,
                  decimal as NumberFormat["decimal"],
                ),
              })
            }
          />
          {amount?.mode === "signed" && (
            <>
              <LabeledSelect
                label="Amount column"
                value={amount.column}
                options={columns}
                onChange={(column) => onChange(withAmount(table, { column }))}
              />
              <LabeledSelect
                label="Expenses are"
                value={amount.expenseSign}
                options={EXPENSE_SIGN_OPTIONS}
                onChange={(expenseSign) =>
                  onChange(withAmount(table, { expenseSign }))
                }
              />
            </>
          )}
          {amount?.mode === "split" && (
            <>
              <LabeledSelect
                label="Expense column"
                value={amount.expenseColumn}
                options={columns}
                onChange={(expenseColumn) =>
                  onChange(withAmount(table, { expenseColumn }))
                }
              />
              <LabeledSelect
                label="Income column"
                value={amount.incomeColumn}
                options={columns}
                onChange={(incomeColumn) =>
                  onChange(withAmount(table, { incomeColumn }))
                }
              />
            </>
          )}
          {amount?.mode === "type_column" && (
            <>
              <LabeledSelect
                label="Amount column"
                value={amount.column}
                options={columns}
                onChange={(column) => onChange(withAmount(table, { column }))}
              />
              <LabeledSelect
                label="Income or expense column"
                value={amount.typeColumn}
                options={columns}
                onChange={(typeColumn) =>
                  onChange(withAmount(table, { typeColumn }))
                }
              />
            </>
          )}
          {table.layout === "rows" && (
            <LabeledSelect
              label="Description column"
              value={table.descriptionColumns[0] ?? NO_COLUMN}
              options={[{ value: NO_COLUMN, label: "None" }, ...columns]}
              onChange={(column) => onChange(withDescription(column))}
            />
          )}
        </div>
      )}
    </Surface>
  );
}
