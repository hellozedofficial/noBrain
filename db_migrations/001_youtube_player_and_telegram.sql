-- =============================================================================
-- noBrain Database Migration 001
-- Target: YouTube Agentic Media Player & Telegram Bot Integration
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1. Create copilot_youtube_player table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copilot_youtube_player` (
  `user_id` varchar(64) NOT NULL,
  `current_video_id` varchar(32) DEFAULT NULL,
  `current_video_data` longtext DEFAULT NULL,
  `queue_data` longtext DEFAULT NULL,
  `notes_data` longtext DEFAULT NULL,
  `folders_data` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_youtube_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Verify copilot_messages has duration_seconds and image_url columns
-- -----------------------------------------------------------------------------
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'copilot_messages' 
  AND COLUMN_NAME = 'duration_seconds';

SET @stmt = IF(@col_exists = 0, 'ALTER TABLE copilot_messages ADD COLUMN duration_seconds float DEFAULT NULL', 'SELECT 1');
PREPARE exec_stmt FROM @stmt;
EXECUTE exec_stmt;
DEALLOCATE PREPARE exec_stmt;

SET @col_img_exists = 0;
SELECT COUNT(*) INTO @col_img_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'copilot_messages' 
  AND COLUMN_NAME = 'image_url';

SET @stmt_img = IF(@col_img_exists = 0, 'ALTER TABLE copilot_messages ADD COLUMN image_url varchar(500) DEFAULT NULL', 'SELECT 1');
PREPARE exec_stmt_img FROM @stmt_img;
EXECUTE exec_stmt_img;
DEALLOCATE PREPARE exec_stmt_img;

