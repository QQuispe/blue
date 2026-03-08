import { pool } from '~/server/db/index'
import { createHash, randomBytes } from 'crypto'

/**
 * Hashes a raw token using SHA-256.
 * Never store raw tokens — always hash before DB operations.
 */
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

/**
 * Generates a cryptographically secure random token (32 bytes hex).
 */
export const generateToken = (): string => randomBytes(32).toString('hex')

/**
 * Creates a new access/refresh token pair in the DB.
 * On initial login, pass a new UUID for family.
 * On rotation, pass the existing family UUID to preserve lineage.
 * max_expires_at is only set on initial creation — never updated on rotation.
 *
 * @param userId - Authenticated user ID
 * @param clientName - Human-readable client label (e.g. "Android App")
 * @param clientId - Machine client identifier (e.g. "android", "ios")
 * @param family - UUID linking all rotated tokens together
 * @param maxExpiresAt - Absolute session expiry — preserved across rotations
 */
export const createTokenPair = async (
  userId: number,
  clientName: string,
  clientId: string,
  family: string,
  maxExpiresAt: Date
) => {
  const accessToken = generateToken()
  const refreshToken = generateToken()
  const now = new Date()
  const accessExpiry = new Date(now.getTime() + 15 * 60 * 1000)
  const refreshExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await pool.query(
    `INSERT INTO api_tokens
      (user_id, token_hash, refresh_hash, token_family, client_id, name,
       expires_at, refresh_expires_at, max_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      userId,
      hashToken(accessToken),
      hashToken(refreshToken),
      family,
      clientId,
      clientName,
      accessExpiry,
      refreshExpiry,
      maxExpiresAt,
    ]
  )

  return { accessToken, refreshToken, expiresAt: accessExpiry }
}

/**
 * Finds a token record by hashed access token.
 */
export const findTokenByHash = async (hash: string) => {
  const result = await pool.query(`SELECT * FROM api_tokens WHERE token_hash = $1`, [hash])
  return result.rows[0] || null
}

/**
 * Finds a token record by hashed refresh token.
 */
export const findRefreshByHash = async (hash: string) => {
  const result = await pool.query(`SELECT * FROM api_tokens WHERE refresh_hash = $1`, [hash])
  return result.rows[0] || null
}

/**
 * Revokes all tokens in a family.
 * Used when refresh token reuse is detected (session compromise)
 * or when user explicitly logs out with token_type_hint=refresh_token.
 */
export const revokeTokenFamily = async (family: string) => {
  await pool.query(
    `UPDATE api_tokens SET revoked_at = NOW()
     WHERE token_family = $1 AND revoked_at IS NULL`,
    [family]
  )
}

/**
 * Revokes a single token by its hash.
 * Used for access token revocation or during rotation.
 */
export const revokeTokenByHash = async (tokenHash: string) => {
  await pool.query(`UPDATE api_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash])
}

/**
 * Updates last_used_at timestamp for a token record.
 * Called on every successful access token validation.
 */
export const updateTokenLastUsed = async (id: number) => {
  await pool.query(`UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1`, [id])
}

/**
 * Deletes expired and long-revoked token records.
 * Intended for nightly scheduled cleanup.
 * Removes tokens where both access and refresh are expired,
 * or where revocation is older than 7 days.
 *
 * @returns Number of deleted rows
 */
export const deleteExpiredTokens = async (): Promise<number> => {
  const result = await pool.query(
    `DELETE FROM api_tokens
     WHERE (expires_at < NOW() AND refresh_expires_at < NOW())
        OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days')`
  )
  return result.rowCount ?? 0
}
