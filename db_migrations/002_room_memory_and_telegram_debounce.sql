-- =============================================================================
-- noBrain Database Migration 002
-- Target: Room Long-Term Memory & Telegram 15s Debounce Queue
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1. Add memory column to copilot_rooms for persistent room context summaries
-- -----------------------------------------------------------------------------
SET @col_mem_exists = 0;
SELECT COUNT(*) INTO @col_mem_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'copilot_rooms' 
  AND COLUMN_NAME = 'memory';

SET @stmt_mem = IF(@col_mem_exists = 0, 'ALTER TABLE copilot_rooms ADD COLUMN memory text DEFAULT NULL', 'SELECT 1');
PREPARE exec_stmt_mem FROM @stmt_mem;
EXECUTE exec_stmt_mem;
DEALLOCATE PREPARE exec_stmt_mem;

-- -----------------------------------------------------------------------------
-- 2. Create copilot_telegram_debounce table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copilot_telegram_debounce` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chat_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `user_name` varchar(100) NOT NULL DEFAULT 'Telegram User',
  `room_id` varchar(64) NOT NULL,
  `bot_token` varchar(255) NOT NULL,
  `message_id` bigint DEFAULT NULL,
  `text_content` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','processing','completed') NOT NULL DEFAULT 'pending',
  `trigger_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_status` (`chat_id`, `status`),
  KEY `idx_trigger` (`trigger_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
