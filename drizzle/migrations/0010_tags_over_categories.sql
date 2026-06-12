ALTER TABLE `transactions` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `transactions` SET `tags` = json_array(`category`) WHERE `category` IS NOT NULL AND `category` != '';--> statement-breakpoint
ALTER TABLE `transactions` DROP COLUMN `category`;
