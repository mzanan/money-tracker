import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const reminderFields = {
  label: z.string().trim().min(1, "Name is required").max(80),
  amount: z.number().finite().positive().nullable().optional(),
  currency: z.string().trim().max(10).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY", "CUSTOM_MONTHS"]),
  intervalMonths: z.number().int().min(1).max(120).nullable().optional(),
  lastPaidOn: z.string().regex(DATE_RE).nullable().optional(),
  nextDueOn: z.string().regex(DATE_RE, "Invalid date (yyyy-MM-dd)"),
  source: z.string().trim().max(40).nullable().optional(),
  note: z.string().trim().max(280).nullable().optional(),
};

const customMonthsCheck = (data: { frequency: string; intervalMonths?: number | null }) =>
  data.frequency !== "CUSTOM_MONTHS" ||
  (typeof data.intervalMonths === "number" && data.intervalMonths >= 1);

const customMonthsError = {
  message: "Set the number of months",
  path: ["intervalMonths"],
};

export const createReminderSchema = z
  .object(reminderFields)
  .refine(customMonthsCheck, customMonthsError);

export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const updateReminderSchema = z
  .object({ ...reminderFields, id: z.string().uuid("Invalid id") })
  .refine(customMonthsCheck, customMonthsError);

export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
