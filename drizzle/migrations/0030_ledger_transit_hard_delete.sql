PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ledger_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`institution` text,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ledger_accounts_kind_check" CHECK("__new_ledger_accounts"."kind" IN ('asset', 'expense', 'income', 'bridge', 'pending', 'transit'))
);
--> statement-breakpoint
INSERT INTO `__new_ledger_accounts`("id", "user_id", "kind", "key", "institution", "name", "currency", "created_at") SELECT "id", "user_id", "kind", "key", "institution", "name", "currency", "created_at" FROM `ledger_accounts`;--> statement-breakpoint
DROP TABLE `ledger_accounts`;--> statement-breakpoint
ALTER TABLE `__new_ledger_accounts` RENAME TO `ledger_accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_accounts_identity_uniq` ON `ledger_accounts` (`user_id`,`kind`,`key`,`currency`);--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_accounts_owner_currency_uniq` ON `ledger_accounts` (`user_id`,`id`,`currency`);--> statement-breakpoint
ALTER TABLE `ledger_transactions` DROP COLUMN `voided_at`;