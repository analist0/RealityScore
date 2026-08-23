CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_name` text NOT NULL,
	`locality` text NOT NULL,
	`category` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`verification_status` text DEFAULT 'candidate' NOT NULL,
	`source_evidence_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`review_id` integer NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_id` text NOT NULL,
	`business_name` text NOT NULL,
	`answers_json` text NOT NULL,
	`generated_draft` text NOT NULL,
	`moderation_status` text DEFAULT 'pending' NOT NULL,
	`visit_confidence` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
