import { H3Event } from 'h3'
import { createError, getCookie, getRequestHeader } from 'h3'
import type { User } from '~/types/database'
import { getUserById } from '~/server/db/queries/users'
import { verifySignedSession } from '~/server/utils/session'
import { requireBearerAuth } from '~/server/utils/bearerAuth'

/**
 * Require authentication for a route
 * Returns the user object or throws an error
 */
export async function requireAuth(event: H3Event): Promise<User> {
  const sessionCookie = getCookie(event, 'blue-session')

  if (!sessionCookie) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  }

  // Parse and verify signed session
  const session = verifySignedSession(sessionCookie)

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid session',
    })
  }

  // Get fresh user data
  const user = await getUserById(session.userId)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User not found',
    })
  }

  if (!user.is_active) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Account is deactivated',
    })
  }

  return user
}

/**
 * Accepts either cookie session (web app) or Bearer token (native app).
 * Use this on endpoints that both clients call.
 * Checks for Authorization header first — falls back to cookie session.
 */
export const requireAnyAuth = async (event: H3Event): Promise<User> => {
  const authHeader = getRequestHeader(event, 'authorization')

  if (authHeader?.startsWith('Bearer ')) {
    return await requireBearerAuth(event)
  }

  return await requireAuth(event)
}

/**
 * Assert that a resource belongs to the current user
 * Throws 403 if ownership check fails
 */
export function assertOwnership(
  resource: { user_id?: number } | null | undefined,
  userId: number,
  resourceName: string = 'Resource'
): void {
  if (!resource) {
    throw createError({
      statusCode: 404,
      statusMessage: `${resourceName} not found`,
    })
  }

  if (resource.user_id !== userId) {
    throw createError({
      statusCode: 403,
      statusMessage: `You do not have permission to access this ${resourceName}`,
    })
  }
}

/**
 * Optional auth - returns user if logged in, null otherwise
 * Does not throw error if not authenticated
 */
export async function getAuthUser(event: H3Event): Promise<User | null> {
  try {
    const sessionCookie = getCookie(event, 'blue-session')

    if (!sessionCookie) {
      return null
    }

    // Parse and verify signed session
    const session = verifySignedSession(sessionCookie)

    if (!session) {
      return null
    }

    const user = await getUserById(session.userId)

    if (!user || !user.is_active) {
      return null
    }

    return user
  } catch (error) {
    return null
  }
}

/**
 * Require admin authentication for a route
 * Returns the user object or throws an error
 */
export async function requireAdmin(event: H3Event): Promise<User> {
  const user = await requireAuth(event)
  if (!user.is_admin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Admin only.',
    })
  }
  return user
}
