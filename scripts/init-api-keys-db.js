#!/usr/bin/env node
// Run: node scripts/init-api-keys-db.js
'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'openrouter_ai',
    waitForConnections: true,
    connectionLimit: 5,
  });

  console.log('🔑 Initializing API keys table...');

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId VARCHAR(100) NOT NULL,
      \`key\` VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL DEFAULT 'My API Key',
      domain_allowlist TEXT DEFAULT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_used_at TIMESTAMP NULL DEFAULT NULL,
      usage_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_key (\`key\`),
      INDEX idx_userId (userId)
    )
  `);

  console.log('✅ api_keys table ready.');
  await pool.end();
  console.log('Done.');
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
