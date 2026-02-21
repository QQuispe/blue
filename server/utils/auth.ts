import { H3Event } from 'h3'
import { createError, getCookie } from 'h3'
import { User } from '~/types/database'
import { getUserById } from '~/server/db/queries/users'
import { verifySignedSession } from '~/server/utils/session'

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
