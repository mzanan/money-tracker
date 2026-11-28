import { z } from "zod";

import { SHEET_REQUEST_ROWS } from "@/lib/constants/sheetImport";
import { RowLogSchema } from "@/lib/sheetImport/log";
import { ConventionsSchema } from "@/lib/sheetImport/layout";

export const MAX_SIGNATURES = 500;

export const ImportRowSchema = z.object({
  sheet: z.string(),
  row: z.number().int().nonnegative(),
  csv: z.object({
    kind: z.enum(["income", "expense"]),
    amount: z.number(),
    currency: z.string(),
    occurredOn: z.string(),
    description: z.string().nullable(),
    externalId: z.string().nullable().optional(),
  }),
});

export type ImportRow = z.infer<typeof ImportRowSchema>;

export const StartImportSchema = z.object({
  source: z.string(),
  fileName: z.string(),
});

export const ChunkInputSchema = z.object({
  importId: z.string().min(1),
  rows: z.array(ImportRowSchema).max(SHEET_REQUEST_ROWS),
});

export const FinishImportSchema = z.object({
  importId: z.string().min(1),
  rows: z.array(RowLogSchema),
  layouts: z
    .array(z.object({ signature: z.string(), conventions: ConventionsSchema }))
    .max(MAX_SIGNATURES),
});
