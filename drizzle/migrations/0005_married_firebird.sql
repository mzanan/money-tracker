ALTER TABLE `user_settings` ADD `calendar_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_calendar_token_uniq` ON `user_settings` (`calendar_token`);