CREATE TABLE `draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prize_id` integer NOT NULL,
	`status` text NOT NULL,
	`seed_hash` text,
	`seed` text,
	`lottery_result` text,
	`eligible` text,
	`winning_number` integer,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`done_at` text,
	FOREIGN KEY (`prize_id`) REFERENCES `prizes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `draws_prize_id_unique` ON `draws` (`prize_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`method` text DEFAULT 'nequi' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prizes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raffle_id` integer NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`kind` text NOT NULL,
	`value` integer NOT NULL,
	`method` text NOT NULL,
	`lottery_name` text,
	`source_position` integer,
	`draw_date` text NOT NULL,
	`paid_before` text,
	`exclude_previous_winners` integer DEFAULT true NOT NULL,
	`fallback` text DEFAULT 'roulette' NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `raffles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`theme` text DEFAULT 'generico' NOT NULL,
	`number_count` integer NOT NULL,
	`price` integer NOT NULL,
	`min_deposit` integer NOT NULL,
	`payment_deadline` text NOT NULL,
	`draw_date` text NOT NULL,
	`payment_info` text DEFAULT '' NOT NULL,
	`organizer_phone` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raffles_slug_unique` ON `raffles` (`slug`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raffle_id` integer NOT NULL,
	`number` integer NOT NULL,
	`player_id` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`paid_in_full_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_raffle_number` ON `tickets` (`raffle_id`,`number`);