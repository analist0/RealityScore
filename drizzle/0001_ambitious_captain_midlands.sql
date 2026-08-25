CREATE TABLE `answer_bank` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text DEFAULT 'general' NOT NULL,
	`question_normalized` text NOT NULL,
	`question_raw` text NOT NULL,
	`answer_text` text NOT NULL,
	`audio_object_key` text,
	`source_provider` text,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_bank_scope_question_idx` ON `answer_bank` (`scope`,`question_normalized`);--> statement-breakpoint
CREATE TABLE `rate_limit_hits` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
