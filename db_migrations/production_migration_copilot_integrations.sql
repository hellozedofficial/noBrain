-- =============================================================================
-- noBrain Production Database Migration
-- Target: Copilot & Integrations (Gmail, Google Drive, AI Bots, Rooms, Files)
-- Date: November 2026
-- Compatibility: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- Engine: InnoDB | Character Set: utf8mb4
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Copilot Bots Table (AI Teammates: CEO, CTO, CBO, custom bots)
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
  `rules` longtext DEFAULT NULL,
  `memory` text DEFAULT NULL,
  `open_items` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_bot_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Copilot Rooms Table (Multi-Agent Shared Squad Workspaces)
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
  `assigned_bot_ids` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Copilot Files Table (Dedicated Markdown Specs, Plans, Documents)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Copilot Messages Table (Chat History, Reasoning Chains, Tool Executions)
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
  `tool_calls` longtext DEFAULT NULL,
  `duration_seconds` float DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_room` (`room_id`),
  KEY `idx_bot` (`bot_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Copilot Integrations Table (Google OAuth, Gmail, Google Drive, Tokens)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copilot_integrations` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `account_email` varchar(255) DEFAULT NULL,
  `status` enum('connected','disconnected') DEFAULT 'connected',
  `metadata` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_provider` (`user_id`,`provider`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Coworker Bots Table (Autonomous Coworker Subsystem)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coworker_bots` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` varchar(255) DEFAULT '',
  `avatar` varchar(50) DEFAULT 'blue-rectangle',
  `status` enum('idle','thinking','working','action_needed') DEFAULT 'idle',
  `rules` longtext DEFAULT NULL,
  `memory` text DEFAULT NULL,
  `shared_memory` text DEFAULT NULL,
  `open_items` longtext DEFAULT NULL,
  `routines` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Coworker Messages Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coworker_messages` (
  `id` varchar(64) NOT NULL,
  `bot_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `role` enum('user','assistant','system') NOT NULL,
  `content` longtext NOT NULL,
  `tool_calls` longtext DEFAULT NULL,
  `tool_results` longtext DEFAULT NULL,
  `reasoning` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bot` (`bot_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Coworker Files Table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Coworker Routines Table (Scheduled Automations)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Coworker Approvals Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coworker_approvals` (
  `id` varchar(64) NOT NULL,
  `bot_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `details` longtext DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bot` (`bot_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Verification Query: Check that all tables exist
-- =============================================================================
SELECT table_name, table_rows 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name IN (
    'copilot_bots',
    'copilot_rooms',
    'copilot_files',
    'copilot_messages',
    'copilot_integrations',
    'coworker_bots',
    'coworker_messages',
    'coworker_files',
    'coworker_routines',
    'coworker_approvals'
  );

