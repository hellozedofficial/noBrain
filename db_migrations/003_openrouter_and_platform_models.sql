-- =============================================================================
-- Migration: Platform Models Table & OpenRouter Integration
-- Date: November 2026
-- =============================================================================

CREATE TABLE IF NOT EXISTS `platform_models` (
  `id` VARCHAR(120) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'openrouter',
  `description` VARCHAR(255) DEFAULT NULL,
  `input_text` TINYINT(1) NOT NULL DEFAULT 1,
  `input_image` TINYINT(1) NOT NULL DEFAULT 0,
  `output_text` TINYINT(1) NOT NULL DEFAULT 1,
  `output_image` TINYINT(1) NOT NULL DEFAULT 0,
  `input_price_per_million` DECIMAL(10, 4) NOT NULL DEFAULT 60.0000,
  `output_price_per_million` DECIMAL(10, 4) NOT NULL DEFAULT 110.0000,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add model column to copilot_bots if not exists
SET @dbname = DATABASE();
SET @tablename = "copilot_bots";
SET @columnname = "model";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE copilot_bots ADD COLUMN `model` VARCHAR(120) DEFAULT NULL AFTER `screen_color`"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Seed default models if table is empty
INSERT IGNORE INTO `platform_models` 
(`id`, `name`, `provider`, `description`, `input_text`, `input_image`, `output_text`, `output_image`, `input_price_per_million`, `output_price_per_million`, `is_active`, `is_default`, `sort_order`)
VALUES
('nobrain-1.5', 'noBrain 1.5', 'builtin', 'Primary high-performance neural engine with deep reasoning & Bengali fluency', 1, 1, 1, 0, 60.0000, 110.0000, 1, 1, 1),
('anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'openrouter', 'Anthropic state-of-the-art model for complex coding, vision & deep reasoning', 1, 1, 1, 0, 360.0000, 1800.0000, 1, 0, 2),
('openai/gpt-4o', 'GPT-4o', 'openrouter', 'OpenAI flagship multimodal intelligence with high speed & vision', 1, 1, 1, 0, 300.0000, 1200.0000, 1, 0, 3),
('google/gemini-2.0-flash-001', 'Gemini 2.0 Flash', 'openrouter', 'Next-gen multimodal speed & reasoning from Google DeepMind', 1, 1, 1, 0, 12.0000, 48.0000, 1, 0, 4),
('meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B', 'openrouter', 'Meta open-weight high intelligence reasoning & instruct model', 1, 0, 1, 0, 15.0000, 50.0000, 1, 0, 5);

-- Ensure OPENROUTER_API_KEY config entry exists in platform_config
INSERT IGNORE INTO `platform_config` (`config_key`, `config_value`, `category`, `description`, `is_secret`)
VALUES
('OPENROUTER_API_KEY', '', 'ai', 'OpenRouter API Key for accessing external LLM models', 1),
('OPENROUTER_DEFAULT_MODEL', 'nobrain-1.5', 'ai', 'Default active model slug on the platform', 0);

