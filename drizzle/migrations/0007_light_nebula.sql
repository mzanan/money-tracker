CREATE TABLE `merchant_categories` (
	`user_id` text NOT NULL,
	`merchant` text NOT NULL,
	`category` text,
	`source` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`user_id`, `merchant`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "merchant_categories_source_check" CHECK("merchant_categories"."source" IN ('ai', 'user'))
);
