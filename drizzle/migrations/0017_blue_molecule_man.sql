CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`event` text NOT NULL,
	`detail` text,
	`country` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "usage_events_event_check" CHECK("usage_events"."event" IN ('signup', 'image_extract_success', 'image_extract_error', 'chat_message')),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `usage_events_user_created_idx` ON `usage_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `usage_events_event_created_idx` ON `usage_events` (`event`,`created_at`);