DROP INDEX `locations_user_start_uniq`;--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "transactions_source_external_uniq";--> statement-breakpoint
DROP INDEX "transactions_user_occurred_idx";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "user_settings_ingest_token_uniq";--> statement-breakpoint
DROP INDEX "user_settings_calendar_token_uniq";--> statement-breakpoint
ALTER TABLE `locations` ALTER COLUMN "start_date" TO "start_date" text;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_source_external_uniq` ON `transactions` (`user_id`,`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `transactions_user_occurred_idx` ON `transactions` (`user_id`,`occurred_on`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_ingest_token_uniq` ON `user_settings` (`ingest_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_calendar_token_uniq` ON `user_settings` (`calendar_token`);--> statement-breakpoint
ALTER TABLE `locations` ADD `end_date` text;