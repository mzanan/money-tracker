import { z } from "zod";

import type { DuplicateStep } from "@/lib/constants/sheetImport";
import type { CandidateMatch } from "@/lib/imageExtract";

export const CheckRowSchema = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  currency: z.string().nullable(),
  description: z.string(),
  fingerprintKey: z.string(),
  occurrence: z.number().int().positive(),
});

export type CheckRow = z.infer<typeof CheckRowSchema>;

export type SheetRowState = "new" | "already_imported" | "duplicate";

export interface SheetRowCheck {
  externalId: string;
  state: SheetRowState;
  step: DuplicateStep | null;
  match: CandidateMatch | null;
}
