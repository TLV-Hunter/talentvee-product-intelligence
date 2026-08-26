CREATE TABLE `cloud_sync` (
	`user_email` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`updated_at` text NOT NULL,
	`product_count` integer DEFAULT 0 NOT NULL,
	`data_bytes` integer DEFAULT 0 NOT NULL,
	`watchlist_json` text DEFAULT '[]' NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL
);
