-- =============================================================================
-- noBrain Complete Production Database Schema (Full Dump)
-- All 22 Tables: Users, Wallets, Chat, Browser Agent, Copilot, Integrations
-- Compatibility: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Table: api_keys
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` varchar(100) NOT NULL,
  `key` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL DEFAULT 'My API Key',
  `domain_allowlist` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `usage_count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `idx_key` (`key`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: browser_task_actions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `browser_task_actions` (
  `id` varchar(64) NOT NULL,
  `task_id` varchar(64) NOT NULL,
  `step_number` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `description` varchar(500) NOT NULL,
  `tool_name` varchar(50) NOT NULL,
  `tool_args` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tool_args`)),
  `result` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`result`)),
  `status` enum('pending','running','success','failed','skipped','awaiting_approval','awaiting_input') NOT NULL DEFAULT 'pending',
  `screenshot_url` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_task_step` (`task_id`,`step_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: browser_tasks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `browser_tasks` (
  `id` varchar(64) NOT NULL,
  `conversation_id` varchar(64) DEFAULT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `goal` text NOT NULL,
  `status` enum('running','paused','awaiting_approval','awaiting_input','human_control','completed','failed','stopped') DEFAULT 'running',
  `current_url` text DEFAULT NULL,
  `page_title` varchar(500) DEFAULT NULL,
  `requires_approval_action` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`requires_approval_action`)),
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: conversations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `model` varchar(100) NOT NULL DEFAULT 'apodex/apodex-1.1-mini:free',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `user_id` varchar(36) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: copilot_bots
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copilot_bots` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(64) DEFAULT NULL,
  `role` varchar(255) DEFAULT '',
  `shape` varchar(30) DEFAULT 'rectangle',
  `color` varchar(30) DEFAULT '#2b49a3',
  `trim_color` varchar(30) DEFAULT '#93a6c8',
  `screen_color` varchar(30) DEFAULT '#e8f2ff',
  `status` enum('idle','thinking','working','action_needed') DEFAULT 'idle',
  `is_pinned` tinyint(1) DEFAULT 0,
  `cleared_at` timestamp NULL DEFAULT NULL,
  `rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rules`)),
  `memory` text DEFAULT NULL,
  `open_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`open_items`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_bot_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: copilot_files
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copilot_files` (
  `id` varchar(64) NOT NULL,
  `bot_id` varchar(64) DEFAULT NULL,
  `room_id` varchar(64) DEFAULT NULL,
  `user_id` varchar(64) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bot_file` (`bot_id`,`file_path`),
  KEY `idx_bot` (`bot_id`),
  KEY `idx_files_room` (`room_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: copilot_integrations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copilot_integrations` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `account_email` varchar(255) DEFAULT NULL,
  `status` enum('connected','disconnected') DEFAULT 'connected',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_provider` (`user_id`,`provider`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: copilot_messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copilot_messages` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `room_id` varchar(64) DEFAULT NULL,
  `bot_id` varchar(64) DEFAULT NULL,
  `sender_name` varchar(100) NOT NULL,
  `role` enum('user','assistant','system') NOT NULL,
  `content` longtext NOT NULL,
  `reasoning` longtext DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `tool_calls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tool_calls`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `duration_seconds` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_room` (`room_id`),
  KEY `idx_bot` (`bot_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: copilot_rooms
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copilot_rooms` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `topic` varchar(255) DEFAULT '',
  `avatar_url` varchar(255) DEFAULT NULL,
  `chief_bot_id` varchar(64) DEFAULT NULL,
  `is_pinned` tinyint(1) DEFAULT 0,
  `cleared_at` timestamp NULL DEFAULT NULL,
  `assigned_bot_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`assigned_bot_ids`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: coworker_approvals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coworker_approvals` (
  `id` varchar(64) NOT NULL,
  `bot_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bot` (`bot_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: coworker_bots
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coworker_bots` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` varchar(255) DEFAULT '',
  `avatar` varchar(50) DEFAULT 'blue-rectangle',
  `status` enum('idle','thinking','working','action_needed') DEFAULT 'idle',
  `rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rules`)),
  `memory` text DEFAULT NULL,
  `shared_memory` text DEFAULT NULL,
  `open_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`open_items`)),
  `routines` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`routines`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: coworker_files
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coworker_files` (
  `id` varchar(64) NOT NULL,
  `bot_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bot_path` (`bot_id`,`file_path`),
  KEY `idx_bot` (`bot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: coworker_messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coworker_messages` (
  `id` varchar(64) NOT NULL,
  `bot_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `role` enum('user','assistant','system') NOT NULL,
  `content` longtext NOT NULL,
  `tool_calls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tool_calls`)),
  `tool_results` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tool_results`)),
  `reasoning` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bot` (`bot_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: coworker_routines
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coworker_routines` (
  `id` varchar(64) NOT NULL,
  `bot_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `prompt` text NOT NULL,
  `schedule_type` enum('hourly','daily','weekly','manual') DEFAULT 'daily',
  `last_run_at` timestamp NULL DEFAULT NULL,
  `next_run_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','paused') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bot` (`bot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: email_verifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `task_id` varchar(64) DEFAULT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `sender_filter` varchar(255) DEFAULT NULL,
  `subject_filter` varchar(255) DEFAULT NULL,
  `extracted_code` varchar(100) DEFAULT NULL,
  `extracted_link` text DEFAULT NULL,
  `status` enum('waiting','found','timeout','manual') DEFAULT 'waiting',
  `raw_body` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
  `id` varchar(36) NOT NULL,
  `conversation_id` varchar(36) NOT NULL,
  `role` enum('user','assistant','system') NOT NULL,
  `content` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `model` varchar(100) DEFAULT NULL,
  `prompt_tokens` int(11) DEFAULT 0,
  `completion_tokens` int(11) DEFAULT 0,
  `total_tokens` int(11) DEFAULT 0,
  `image_url` varchar(500) DEFAULT NULL,
  `feedback` varchar(10) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_conversation` (`conversation_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: password_resets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(191) NOT NULL,
  `otp` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_email_otp` (`email`,`otp`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: saleonic_settings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `saleonic_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) NOT NULL DEFAULT 'default',
  `api_key` text NOT NULL,
  `base_url` varchar(255) NOT NULL DEFAULT 'https://saleonic.com/api/v1',
  `is_connected` tinyint(1) NOT NULL DEFAULT 1,
  `last_tested_at` timestamp NULL DEFAULT NULL,
  `merchant_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`merchant_info`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `walletId` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('credit','debit') NOT NULL,
  `description` varchar(255) NOT NULL,
  `referenceId` varchar(100) NOT NULL,
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `referenceId` (`referenceId`),
  KEY `walletId` (`walletId`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`walletId`) REFERENCES `wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: user_profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `date_of_birth` varchar(50) DEFAULT NULL,
  `username_preference` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `last_used_model` varchar(100) NOT NULL DEFAULT 'inclusionai/ling-3.0-flash-sante:free',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Table: wallets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` varchar(100) NOT NULL,
  `balance` decimal(10,2) DEFAULT 0.00,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
