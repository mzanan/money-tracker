import { generateText } from "ai";
import { z } from "zod";

import { resolveSheetImportModel } from "@/lib/ai/provider";
import { SheetRecipeSchema, type SheetRecipe } from "@/lib/sheetImport/recipe";

const SYSTEM = `You read a personal finance spreadsheet that a person built by hand and return an import recipe.
Code applies your recipe to every row of the file. Never list transactions yourself; describe where the data is.

You get each sheet as rows. Each row starts with its 1-based number (R4) and lists its non-empty cells as COLUMN:value.
Strings are quoted, numbers are bare, real date cells appear as date(YYYY-MM-DD), broken cells appear as error(...). Rows may be omitted in the middle of long sheets. A sheet marked "same header as" another one shares that layout and shows fewer sample rows; it still gets its own entry in "tables".

Return only one JSON object, no prose and no code fences, valid against this JSON Schema:
${JSON.stringify(z.toJSONSchema(SheetRecipeSchema))}

Rules:
- One entry in "tables" per table. A tab holding two separate tables (for example expenses on the left, income on the right) gets two entries with the same "sheet". Tabs that only summarize other tabs get an entry with "import": false.
- "rows": one transaction per row; fill "amount" and "descriptionColumns", set "grid" to null. "grid": a matrix where each non-empty amount cell is one transaction; fill "grid", set "amount" to null and "descriptionColumns" to [].
- grid "dates_down": dates in "date.column" down the rows, categories in "headerRow" across; each cell is described by its column header. grid "dates_across": dates or month names in "headerRow" across the columns, categories in "categoryColumn" down the rows; each cell is described by its row label.
- Only real transaction rows count: leave out titles, headers, totals, subtotals and side summary tables (exclude their rows with firstDataRow/lastDataRow or skipIfContains, and never list a total column as a value column). "skipIfContains" lists every total label exactly as the sheet spells it (Total, Totales, Subtotal, TOTAL GASTOS...); code matches them as whole words.
- "date.fillDown": true only when the sheet writes a date once and leaves the date cell blank on the rows below it for the same day (or merges the date cells); otherwise false, and rows without a date are reported to the user.
- "date.sectionOrder": for day_with_section_month, "ascending" when the month sections go forward down the sheet and "descending" when they go backward; null for other kinds. "firstDataRow" is the first month section row.
- "date.kind": "full" = the cell holds a whole date (a missing year comes from "date.year"); "day_of_month" = a day number whose month and year come from the tab name or a title ("date.month", "date.year"); "day_with_section_month" = a day number whose month comes from section rows that only hold a month name (ENERO, FEBRERO...) in the date column above it; "month" = month names or numbers only, dated the 1st. "order" is how the person writes text dates. Pick the operation date, not a value or settlement date.
- "numberFormat" is how the person writes amounts typed as text, inferred from the values themselves (for example 1.250,50 means decimal "," and thousands ".").
- "signed": "expenseSign" is the sign expenses carry in that column; a value with the opposite sign is money coming in (a refund or income).
- "type_column": list every spelling you see of the income and expense labels, typos included, and set "default" for anything else.
- Never take a running balance column as the amount.
- "descriptionColumns": the column(s) with the free text that says what the money was for.
- "currencyColumn": only when a column names the currency of each row; otherwise null.`;

const ATTEMPTS = 2;

function recipeFrom(text: string): SheetRecipe {
  const body = text.replace(/```(?:json)?/g, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start)
    throw new Error("no JSON object in the model reply");
  return SheetRecipeSchema.parse(JSON.parse(body.slice(start, end + 1)));
}

export async function proposeSheetRecipe(
  encodedWorkbook: string,
): Promise<SheetRecipe> {
  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const { text } = await generateText({
      model: resolveSheetImportModel(),
      system: SYSTEM,
      prompt: encodedWorkbook,
      maxRetries: 1,
      maxOutputTokens: 4000,
    });
    try {
      return recipeFrom(text);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
