import 'server-only';
import crypto from 'crypto';
import { query, execute } from '@/lib/db';

export interface ApiKey {
  id: number;
  userId: string;
  key: string;
  name: string;
  domain_allowlist: string | null; // comma-separated domains or null = allow all
  is_active: boolean;
  last_used_at: Date | null;
  usage_count: number;
  created_at: Date;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  error?: string;
  userId?: string;
  keyId?: number;
  keyName?: string;
}

/** Generate a new API key: nbr_<32 random hex chars> */
export function generateApiKey(): string {
  return `nbr_${crypto.randomBytes(24).toString('hex')}`;
}

/** Create a new API key for a user */
export async function createApiKey(
  userId: string,
  name: string,
  domainAllowlist?: string[] | null
): Promise<ApiKey> {
  await ensureApiKeysTable();

  // Limit: max 10 keys per user
  const existing = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM api_keys WHERE userId = ? AND is_active = 1',
    [userId]
  );
  if ((existing[0]?.count ?? 0) >= 10) {
    throw new Error('Maximum of 10 active API keys allowed per user.');
  }

  const key = generateApiKey();
  const domains = domainAllowlist && domainAllowlist.length > 0
    ? domainAllowlist.map(d => d.trim().toLowerCase()).join(',')
    : null;

  await execute(
    'INSERT INTO api_keys (userId, `key`, name, domain_allowlist) VALUES (?, ?, ?, ?)',
    [userId, key, name.trim(), domains]
  );

  const created = await query<ApiKey>(
    'SELECT * FROM api_keys WHERE userId = ? AND `key` = ?',
    [userId, key]
  );
  return created[0];
}

/** Validate an API key from Authorization header, with optional origin domain check */
export async function validateApiKey(
  authHeader: string | null,
  originHeader: string | null
): Promise<ApiKeyValidationResult> {
  if (!authHeader) {
    return { valid: false, error: 'Authorization header is missing.' };
  }

  const key = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!key.startsWith('nbr_')) {
    return { valid: false, error: 'Invalid API key format.' };
  }

  await ensureApiKeysTable();

  const rows = await query<ApiKey>(
    'SELECT * FROM api_keys WHERE `key` = ? AND is_active = 1',
    [key]
  );

  if (rows.length === 0) {
    return { valid: false, error: 'Invalid or inactive API key.' };
  }

  const apiKey = rows[0];

  // Domain protection check
  if (apiKey.domain_allowlist) {
    const allowedDomains = apiKey.domain_allowlist.split(',').map(d => d.trim().toLowerCase());
    const requestOrigin = extractDomain(originHeader);

    if (!requestOrigin || !allowedDomains.some(d => matchesDomain(requestOrigin, d))) {
      return {
        valid: false,
        error: `Request blocked: origin "${requestOrigin || 'unknown'}" is not in the allowed domain list for this API key.`,
      };
    }
  }

  // Update usage stats (fire and forget)
  execute(
    'UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = ?',
    [apiKey.id]
  ).catch(() => {});

  return {
    valid: true,
    userId: apiKey.userId,
    keyId: apiKey.id,
    keyName: apiKey.name,
  };
}

/** List all API keys for a user (key value is masked after first 8 chars) */
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  await ensureApiKeysTable();
  return query<ApiKey>(
    'SELECT * FROM api_keys WHERE userId = ? ORDER BY created_at DESC',
    [userId]
  );
}

/** Revoke (soft-delete) an API key */
export async function revokeApiKey(userId: string, keyId: number): Promise<void> {
  await execute(
    'UPDATE api_keys SET is_active = 0 WHERE id = ? AND userId = ?',
    [keyId, userId]
  );
}

/** Update the domain allowlist for an existing key */
export async function updateApiKeyDomains(
  userId: string,
  keyId: number,
  domainAllowlist: string[] | null
): Promise<void> {
  const domains = domainAllowlist && domainAllowlist.length > 0
    ? domainAllowlist.map(d => d.trim().toLowerCase()).join(',')
    : null;

  await execute(
    'UPDATE api_keys SET domain_allowlist = ? WHERE id = ? AND userId = ?',
    [domains, keyId, userId]
  );
}

/** Ensure api_keys table exists (idempotent) */
export async function ensureApiKeysTable(): Promise<void> {
  await execute(`
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
}

// ── helpers ──────────────────────────────────────────────────────────────────

function extractDomain(originOrReferer: string | null): string | null {
  if (!originOrReferer) return null;
  try {
    const url = new URL(
      originOrReferer.startsWith('http') ? originOrReferer : `https://${originOrReferer}`
    );
    return url.hostname.toLowerCase();
  } catch {
    return originOrReferer.toLowerCase().replace(/^www\./, '');
  }
}

/** Support wildcard: *.example.com matches sub.example.com */
function matchesDomain(requestHost: string, pattern: string): boolean {
  const clean = pattern.replace(/^www\./, '');
  const reqClean = requestHost.replace(/^www\./, '');
  if (clean.startsWith('*.')) {
    const base = clean.slice(2);
    return reqClean === base || reqClean.endsWith('.' + base);
  }
  return reqClean === clean;
}
