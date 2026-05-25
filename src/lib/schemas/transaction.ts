import { z } from "zod";

import { isSupportedCurrency } from "@/config/currencies";

export const createTransactionSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z
    .number()
    .finite("Invalid amount")
    .positive("Amount must be greater than 0"),
  currency: z
    .string()
    .refine(isSupportedCurrency, { message: "Unsupported currency" }),
  category: z.string().trim().max(60).nullable().optional(),
  note: z.string().trim().max(280).nullable().optional(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (yyyy-MM-dd)"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.extend({
  id: z.string().uuid("Invalid id"),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
