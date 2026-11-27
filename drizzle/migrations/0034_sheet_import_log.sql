CREATE TABLE `sheet_import_layouts` (
	`user_id` text NOT NULL,
	`signature` text NOT NULL,
	`recipe_version` integer NOT NULL,
	`conventions` text NOT NULL,
	`last_source` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`user_id`, `signature`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sheet_import_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`user_id` text NOT NULL,
	`sheet` text NOT NULL,
	`row` integer NOT NULL,
	`status` text NOT NULL,
	`step` text,
	`reason` text,
	`external_id` text,
	`matched_transaction_id` text,
	FOREIGN KEY (`import_id`) REFERENCES `sheet_imports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sheet_import_rows_import_idx` ON `sheet_import_rows` (`import_id`);--> statement-breakpoint
CREATE TABLE `sheet_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`file_name` text NOT NULL,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`not_read_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`undone_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sheet_imports_user_idx` ON `sheet_imports` (`user_id`,`created_at`);