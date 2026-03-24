CREATE TABLE `app_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','user') NOT NULL DEFAULT 'user',
	`avatar_url` text,
	`key_limit` int NOT NULL DEFAULT 10,
	`keys_generated` int NOT NULL DEFAULT 0,
	`is_banned` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_signed_in` timestamp,
	CONSTRAINT `app_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`username` varchar(64),
	`action` varchar(128) NOT NULL,
	`details` text,
	`ip_address` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ios_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key_id` int NOT NULL,
	`key_value` varchar(20) NOT NULL,
	`device_id` varchar(255) NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`last_checked` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ios_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `ios_sessions_session_token_unique` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `license_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key_value` varchar(20) NOT NULL,
	`status` enum('inactive','active','paused','banned') NOT NULL DEFAULT 'inactive',
	`duration_days` int NOT NULL,
	`created_by_id` int NOT NULL,
	`activated_at` timestamp,
	`expires_at` timestamp,
	`device_id` varchar(255),
	`device_info` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `license_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `license_keys_key_value_unique` UNIQUE(`key_value`)
);
--> statement-breakpoint
CREATE TABLE `login_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`username` varchar(64) NOT NULL,
	`ip_address` varchar(64),
	`user_agent` text,
	`success` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_history_id` PRIMARY KEY(`id`)
);
