ALTER TABLE `recurring_payments` ADD `installments_total` integer;--> statement-breakpoint
ALTER TABLE `recurring_payments` ADD `installments_paid` integer DEFAULT 0 NOT NULL;