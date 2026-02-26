import { defineEventHandler, createError, setCookie } from 'h3'
import { pool } from '~/server/db/index.js'
import { getUserByUsername, createUser } from '~/server/db/queries/users'

interface SetupResponse {
  statusCode: number
  message: string
  devMode?: boolean
  guestCreated?: boolean
  guestAvailable?: boolean
  hasUsers: boolean
  user?: {
    id: number
    username: string
    email?: string
    isAdmin: boolean
  }
  guestUser?: {
    id: number
    username: string
  }
}

interface SessionData {
  userId: number
  username: string
  email?: string
  isAdmin: boolean
  loggedInAt: string
}

const SESSION_CONFIG = {
  name: 'blue-session',
  password: process.env.SESSION_SECRET || 'your-session-secret-minimum-32-characters-long',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
}

// Check if we're in dev mode
const isDevMode = (): boolean => process.env.DEV_MODE === 'true'

export default defineEventHandler(async (event): Promise<SetupResponse> => {
  try {
    // Check if any users exist
    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    const hasUsers = parseInt(userCount.rows[0].count) > 0

    // If in dev mode and no users, create a guest user
    if (isDevMode() && !hasUsers) {
      const guestUser = await createUser('guest', null, 'guest123')
      if (guestUser) {
        // Make guest user an admin
        await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [guestUser.id])
        guestUser.is_admin = true

        // Create session for guest user
        const session: SessionData = {
          userId: guestUser.id!,
          username: guestUser.username!,
          email: guestUser.email!,
          isAdmin: guestUser.is_admin!,
          loggedInAt: new Date().toISOString(),
        }

        const sessionString = Buffer.from(JSON.stringify(session)).toString('base64')
        setCookie(event, 'blue-session', sessionString, SESSION_CONFIG)

        return {
          statusCode: 200,
          message: 'Guest user created and logged in',
          devMode: true,
          guestCreated: true,
          hasUsers: false,
          user: {
            id: guestUser.id!,
            username: guestUser.username!,
            email: guestUser.email!,
            isAdmin: guestUser.is_admin!,
          },
        }
      }
    }

    // If in dev mode and guest user exists, return guest info
    if (isDevMode()) {
      const guestUser = await getUserByUsername('guest')
      if (guestUser) {
        return {
          statusCode: 200,
          message: 'Dev mode active, guest user available',
          devMode: true,
          guestAvailable: true,
          hasUsers: hasUsers,
          guestUser: {
            id: guestUser.id,
            username: guestUser.username,
          },
        }
      }
    }

    // Normal mode - just return setup status
    return {
      statusCode: 200,
      message: 'Auth setup status',
      devMode: isDevMode(),
      guestAvailable: false,
      hasUsers: hasUsers,
    }
  } catch (error: any) {
    console.error('Auth setup error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check auth setup',
    })
  }
})
