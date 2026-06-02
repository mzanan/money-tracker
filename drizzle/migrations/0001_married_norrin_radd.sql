CREATE TABLE `recurring_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`amount` real,
	`currency` text,
	`category` text,
	`frequency` text NOT NULL,
	`interval_months` integer,
	`last_paid_on` text,
	`next_due_on` text NOT NULL,
	`source` text,
	`note` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "recurring_payments_amount_positive" CHECK("recurring_payments"."amount" > 0)
);
