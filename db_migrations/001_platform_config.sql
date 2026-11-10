-- =============================================================================
-- Migration: Platform Config Table for Admin HQ Panel
-- Date: November 2026
-- =============================================================================

CREATE TABLE IF NOT EXISTS `platform_config` (
  `config_key` varchar(100) NOT NULL,
  `config_value` longtext DEFAULT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'general',
  `description` varchar(255) DEFAULT NULL,
  `is_secret` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

