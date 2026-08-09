import { z } from "zod";

import { isSupportedCurrency } from "@/lib/constants/currencies";

export const createTransactionSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z
    .number()
    .finite("Invalid amount")
    .positive("Amount must be greater than 0"),
  currency: z
    .string()
    .refine(isSupportedCurrency, { message: "Unsupported currency" }),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  note: z.string().trim().max(280).nullable().optional(),
  occurredOn: z.iso.date("Invalid date (yyyy-MM-dd)"),
  source: z.string().trim().min(1).max(32).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.extend({
  id: z.string().uuid("Invalid id"),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
