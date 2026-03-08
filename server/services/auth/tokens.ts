import { createError } from 'h3'
import { randomUUID } from 'crypto'
import {
  createTokenPair,
  findTokenByHash,
  findRefreshByHash,
  revokeTokenFamily,
  revokeTokenByHash,
  updateTokenLastUsed,
  hashToken,
} from '~/server/db/queries/tokens'
import { getUserById } from '~/server/db/queries/users'
import { ErrorCodes } from '~/server/utils/errors'

/**
 * Issues a new access/refresh token pair for a user.
 * Creates a new token family — use for initial login only.
 * For subsequent tokens use rotateRefreshToken().
 *
 * @param userId - Authenticated user ID
 * @param clientName - Human-readable client label (e.g. "Android App")
 * @param clientId - Machine client identifier (e.g. "android", "ios")
 */
export const issueTokenPair = async (
  userId: number,
  clientName: string,
  clientId: string = 'android'
) => {
  const family = randomUUID()
  const maxExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days absolute
  return await createTokenPair(userId, clientName, clientId, family, maxExpiresAt)
}

/**
 * Validates an access token and returns the associated user.
 * Checks: existence, revocation, expiry.
 * Updates last_used_at on success.
 *
 * @param rawToken - Raw (unhashed) access token from Authorization header
 */
export const validateAccessToken = async (rawToken: string) => {
  const hash = hashToken(rawToken)
  const record = await findTokenByHash(hash)

  if (!record) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_INVALID_TOKEN,
    })
  }

  if (record.revoked_at) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_TOKEN_REVOKED,
    })
  }

  if (new Date(record.expires_at) < new Date()) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_TOKEN_EXPIRED,
    })
  }

  await updateTokenLastUsed(record.id)

  const user = await getUserById(record.user_id)
  if (!user || !user.is_active) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_USER_NOT_FOUND,
    })
  }

  return user
}

/**
 * Rotates a refresh token — issues a new token pair and revokes the old one.
 *
 * Security behaviors:
 * - If refresh token is already revoked → reuse detected → revoke entire family
 *   and return AUTH_SESSION_COMPROMISED so client forces re-login
 * - If refresh token is expired → return AUTH_TOKEN_EXPIRED
 * - If max_expires_at exceeded → return AUTH_TOKEN_EXPIRED (force full re-login)
 * - On success → old token revoked, new pair issued in same family
 *   preserving the original max_expires_at cap
 *
 * @param rawRefreshToken - Raw (unhashed) refresh token from client
 */
export const rotateRefreshToken = async (rawRefreshToken: string) => {
  const hash = hashToken(rawRefreshToken)
  const record = await findRefreshByHash(hash)

  if (!record) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_INVALID_TOKEN,
    })
  }

  // Reuse detected — revoke entire family and signal compromise
  if (record.revoked_at) {
    await revokeTokenFamily(record.token_family)
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_SESSION_COMPROMISED,
    })
  }

  // Refresh token expired
  if (new Date(record.refresh_expires_at) < new Date()) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_TOKEN_EXPIRED,
    })
  }

  // Absolute session cap exceeded — force full re-login regardless of rotation
  if (new Date(record.max_expires_at) < new Date()) {
    await revokeTokenFamily(record.token_family)
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_TOKEN_EXPIRED,
    })
  }

  // Revoke old token record
  await revokeTokenByHash(record.token_hash)

  // Issue new pair in same family, preserving original max_expires_at
  return await createTokenPair(
    record.user_id,
    record.name,
    record.client_id,
    record.token_family,
    new Date(record.max_expires_at)
  )
}

/**
 * Revokes a single access token by raw value.
 * For complete logout, prefer revokeFamily() with the refresh token.
 *
 * @param rawToken - Raw (unhashed) access token
 */
export const revokeAccessToken = async (rawToken: string) => {
  await revokeTokenByHash(hashToken(rawToken))
}

/**
 * Revokes an entire token family using a raw refresh token.
 * This is the recommended logout path for native apps —
 * invalidates all future refreshes regardless of rotation state.
 *
 * @param rawRefreshToken - Raw (unhashed) refresh token
 */
export const revokeFamily = async (rawRefreshToken: string) => {
  const hash = hashToken(rawRefreshToken)
  const record = await findRefreshByHash(hash)
  if (record) {
    await revokeTokenFamily(record.token_family)
  }
}
