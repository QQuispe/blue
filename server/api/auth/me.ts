import { defineEventHandler, createError, getCookie } from 'h3'
import { getUserById } from '~/server/db/queries/users'
import { verifySignedSession } from '~/server/utils/session'

interface MeResponse {
  statusCode: number
  message?: string
  user: {
    id: number
    username: string
    email?: string
    isAdmin: boolean
  } | null
}

export default defineEventHandler(async (event): Promise<MeResponse> => {
  try {
    // Get session from cookie
    const sessionCookie = getCookie(event, 'blue-session')

    if (!sessionCookie) {
      return {
        statusCode: 401,
        message: 'Not authenticated',
        user: null,
      }
    }

    // Verify and parse signed session
    const session = verifySignedSession(sessionCookie)

    if (!session) {
      return {
        statusCode: 401,
        message: 'Invalid session',
        user: null,
      }
    }

    // Fetch fresh user data from database
    const user = await getUserById(session.userId)

    if (!user || !user.is_active) {
      return {
        statusCode: 401,
        message: 'User not found or deactivated',
        user: null,
      }
    }

    return {
      statusCode: 200,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin,
      },
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return {
      statusCode: 500,
      message: 'Failed to get current user',
      user: null,
    }
  }
})
