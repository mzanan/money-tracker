import { z } from "zod";

const column = z.string().regex(/^[A-Z]{1,3}$/);

const DateSpecSchema = z.object({
  column: column.describe(
    "Column holding the date (or the month names, for dates across a grid)",
  ),
  kind: z
    .enum(["full", "day_of_month", "day_with_section_month", "month"])
    .describe(
      "full: a whole date. day_of_month: a day number, month and year from the tab or a title. day_with_section_month: a day number, month from rows above that hold only a month name. month: month names or numbers, dated the 1st.",
    ),
  order: z.enum(["dmy", "mdy", "ymd"]).describe("How text dates are written"),
  year: z.number().int().nullable().describe("Year for dates that lack one"),
  month: z
    .number()
    .int()
    .min(1)
    .max(12)
    .nullable()
    .describe("Month for day_of_month dates"),
});

const NumberFormatSchema = z.object({
  decimal: z.enum([",", "."]),
  thousands: z.enum([".", ",", " ", ""]),
});

const SignedAmountSchema = z.object({
  mode: z.literal("signed"),
  column,
  expenseSign: z
    .enum(["positive", "negative"])
    .describe(
      "Sign expenses carry in this column; the opposite sign is money in",
    ),
});

const SplitAmountSchema = z.object({
  mode: z.literal("split"),
  expenseColumn: column,
  incomeColumn: column,
});

const TypeColumnAmountSchema = z.object({
  mode: z.literal("type_column"),
  column,
  typeColumn: column,
  incomeValues: z.array(z.string()),
  expenseValues: z.array(z.string()),
  default: z.enum(["expense", "income"]),
});

const GridSchema = z.object({
  orientation: z.enum(["dates_down", "dates_across"]),
  headerRow: z.number().int().positive(),
  categoryColumn: column.nullable().describe("Row labels, for dates_across"),
  valueColumns: z.array(column),
  kind: z.enum(["expense", "income"]),
});

export const TableRecipeSchema = z.object({
  sheet: z.string().describe("Exact tab name"),
  import: z.boolean().describe("false for tabs that only summarize other tabs"),
  layout: z.enum(["rows", "grid"]),
  firstDataRow: z.number().int().positive(),
  lastDataRow: z.number().int().positive().nullable(),
  skipIfContains: z
    .array(z.string())
    .describe(
      "Rows whose cells contain one of these words are skipped, like total",
    ),
  date: DateSpecSchema,
  numberFormat: NumberFormatSchema,
  amount: z
    .discriminatedUnion("mode", [
      SignedAmountSchema,
      SplitAmountSchema,
      TypeColumnAmountSchema,
    ])
    .nullable()
    .describe("rows layout only"),
  descriptionColumns: z.array(column).describe("rows layout only"),
  currencyColumn: column.nullable(),
  grid: GridSchema.nullable().describe("grid layout only"),
});

export const SheetRecipeSchema = z.object({
  tables: z.array(TableRecipeSchema),
});

export type DateSpec = z.infer<typeof DateSpecSchema>;
export type NumberFormat = z.infer<typeof NumberFormatSchema>;
export type TableRecipe = z.infer<typeof TableRecipeSchema>;
export type SheetRecipe = z.infer<typeof SheetRecipeSchema>;
