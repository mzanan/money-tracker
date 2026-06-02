ALTER TABLE `user_settings` ADD `ingest_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_ingest_token_uniq` ON `user_settings` (`ingest_token`);