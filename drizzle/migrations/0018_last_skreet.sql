CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`label` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_user_source_uniq` ON `accounts` (`user_id`,`source`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`event` text NOT NULL,
	`detail` text,
	`country` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "usage_events_event_check" CHECK("__new_usage_events"."event" IN ('signup', 'image_extract_success', 'image_extract_error', 'chat_message'))
);
--> statement-breakpoint
INSERT INTO `__new_usage_events`("id", "user_id", "event", "detail", "country", "created_at") SELECT "id", "user_id", "event", "detail", "country", "created_at" FROM `usage_events`;--> statement-breakpoint
DROP TABLE `usage_events`;--> statement-breakpoint
ALTER TABLE `__new_usage_events` RENAME TO `usage_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `usage_events_user_created_idx` ON `usage_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `usage_events_event_created_idx` ON `usage_events` (`event`,`created_at`);