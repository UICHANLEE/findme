CREATE TABLE `check_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` text NOT NULL,
	`room` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_state` (
	`team_id` text PRIMARY KEY NOT NULL,
	`current_room` text,
	`entered_at` text,
	`updated_at` text NOT NULL
);
