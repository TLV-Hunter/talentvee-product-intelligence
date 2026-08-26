ALTER TABLE `cloud_sync` ADD `revision` text DEFAULT '' NOT NULL;
ALTER TABLE `cloud_sync` ADD `chunk_count` integer DEFAULT 0 NOT NULL;
ALTER TABLE `cloud_sync` ADD `payload_format` text DEFAULT 'json-chunks-v1' NOT NULL;

CREATE TABLE `cloud_sync_chunk` (
	`user_email` text NOT NULL,
	`revision` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`payload_chunk` text NOT NULL,
	PRIMARY KEY(`user_email`, `revision`, `chunk_index`)
);

CREATE INDEX `cloud_sync_chunk_lookup_idx`
	ON `cloud_sync_chunk` (`user_email`, `revision`, `chunk_index`);
