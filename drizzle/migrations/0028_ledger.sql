CREATE TABLE `ledger_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`institution` text,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ledger_accounts_kind_check" CHECK("ledger_accounts"."kind" IN ('asset', 'expense', 'income', 'bridge', 'pending'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_accounts_identity_uniq` ON `ledger_accounts` (`user_id`,`kind`,`key`,`currency`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`occurred_on` text NOT NULL,
	`legacy_tx_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `ledger_transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `ledger_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ledger_entries_amount_nonzero" CHECK("ledger_entries"."amount" <> 0)
);
--> statement-breakpoint
CREATE INDEX `ledger_entries_account_occurred_idx` ON `ledger_entries` (`account_id`,`occurred_on`);--> statement-breakpoint
CREATE INDEX `ledger_entries_user_idx` ON `ledger_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `ledger_entries_transaction_idx` ON `ledger_entries` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `ledger_external_ids` (
	`user_id` text NOT NULL,
	`origin` text NOT NULL,
	`external_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `origin`, `external_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `ledger_transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ledger_external_ids_transaction_idx` ON `ledger_external_ids` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `ledger_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`occurred_on` text NOT NULL,
	`occurred_at` text NOT NULL,
	`note` text,
	`comment` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`recurring_id` text,
	`is_fixed` integer,
	`budget_month` text,
	`reverses_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recurring_id`) REFERENCES `recurring_payments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reverses_id`) REFERENCES `ledger_transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ledger_transactions_user_occurred_idx` ON `ledger_transactions` (`user_id`,`occurred_on`);--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_transactions_reverses_uniq` ON `ledger_transactions` (`reverses_id`);