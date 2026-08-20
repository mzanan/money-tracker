ALTER TABLE `transactions` ADD `recurring_id` text REFERENCES recurring_payments(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `is_fixed` integer;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `fixed_labels` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `transactions`
SET `recurring_id` = substr(`external_id`, 10, instr(substr(`external_id`, 10), ':') - 1)
WHERE `external_id` LIKE 'reminder:%'
  AND EXISTS (
    SELECT 1 FROM `recurring_payments`
    WHERE `recurring_payments`.`id` = substr(`external_id`, 10, instr(substr(`external_id`, 10), ':') - 1)
  );
