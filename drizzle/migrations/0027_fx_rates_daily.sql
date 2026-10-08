CREATE TABLE `fx_rates_daily` (
	`date` text PRIMARY KEY NOT NULL,
	`rates` text NOT NULL,
	`source` text NOT NULL,
	`fetched_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
