CREATE UNIQUE INDEX `ledger_accounts_owner_currency_uniq` ON `ledger_accounts` (`user_id`,`id`,`currency`);--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_transactions_owner_uniq` ON `ledger_transactions` (`user_id`,`id`);--> statement-breakpoint
CREATE TABLE `ledger_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`transaction_id`) REFERENCES `ledger_transactions`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ledger_revisions_transaction_idx` ON `ledger_revisions` (`transaction_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`account_id` text NOT NULL,
	`currency` text NOT NULL,
	`role` text NOT NULL,
	`amount` integer NOT NULL,
	`occurred_on` text NOT NULL,
	`legacy_tx_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`account_id`,`currency`) REFERENCES `ledger_accounts`(`user_id`,`id`,`currency`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`,`transaction_id`) REFERENCES `ledger_transactions`(`user_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ledger_entries_amount_nonzero" CHECK("__new_ledger_entries"."amount" <> 0),
	CONSTRAINT "ledger_entries_role_check" CHECK("__new_ledger_entries"."role" IN ('amount', 'fee', 'spread', 'withdrawal'))
);
--> statement-breakpoint
INSERT INTO `__new_ledger_entries`("id", "user_id", "transaction_id", "account_id", "currency", "role", "amount", "occurred_on", "legacy_tx_id") SELECT e."id", e."user_id", e."transaction_id", e."account_id", a."currency", NULL, e."amount", e."occurred_on", e."legacy_tx_id" FROM `ledger_entries` e JOIN `ledger_accounts` a ON a."id" = e."account_id";--> statement-breakpoint
DROP TABLE `ledger_entries`;--> statement-breakpoint
ALTER TABLE `__new_ledger_entries` RENAME TO `ledger_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ledger_entries_account_occurred_idx` ON `ledger_entries` (`account_id`,`occurred_on`);--> statement-breakpoint
CREATE INDEX `ledger_entries_user_idx` ON `ledger_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `ledger_entries_transaction_idx` ON `ledger_entries` (`transaction_id`);
