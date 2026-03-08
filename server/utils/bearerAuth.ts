import { getRequestHeader, createError } from 'h3'
import { validateAccessToken } from '~/server/services/auth/tokens'
import { ErrorCodes } from '~/server/utils/errors'

/**
 * Extracts and validates a Bearer token from the Authorization header.
 * Returns the authenticated user on success.
 * Throws 401 if header is missing, malformed, invalid, expired, or revoked.
 */
export const requireBearerAuth = async (event: any) => {
  const authHeader = getRequestHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_REQUIRED,
    })
  }

  const token = authHeader.slice(7).trim()

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_REQUIRED,
    })
  }

  return await validateAccessToken(token)
}
