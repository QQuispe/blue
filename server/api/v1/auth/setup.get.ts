import { defineEventHandler, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { ErrorCodes } from '~/server/utils/errors'
import { createUserSession, isDevMode } from '~/server/services/auth/session'
import type { SetupResponse } from '~/types/api/auth'
import { getUserByUsername, createUser } from '~/server/db/queries/users'
import { pool } from '~/server/db/index.js'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<SetupResponse> => {
    // Check if any users exist
    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    const hasUsers = parseInt(userCount.rows[0].count) > 0

    // If in dev mode and no users, create a guest user
    if (isDevMode() && !hasUsers) {
      const guestUser = await createUser('guest', null, 'guest123')
      if (guestUser && guestUser.id && guestUser.username) {
        // Make guest user an admin
        await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [guestUser.id])

        // Create session for guest user
        const sessionUser = {
          id: guestUser.id,
          username: guestUser.username,
          email: guestUser.email,
          isAdmin: true,
        }
        createUserSession(event, sessionUser)

        return apiSuccess({
          user: sessionUser,
          message: 'Guest user created and logged in',
          hasUsers: false,
          devMode: true,
        })
      }
    }

    // If in dev mode and guest user exists, return guest info
    if (isDevMode()) {
      const guestUser = await getUserByUsername('guest')
      if (guestUser) {
        return apiSuccess({
          message: 'Dev mode active, guest user available',
          hasUsers: true,
          devMode: true,
        })
      }
    }

    // Normal mode - just return setup status
    return apiSuccess({
      message: 'Auth setup status',
      hasUsers,
      devMode: isDevMode(),
    })
  })
)
