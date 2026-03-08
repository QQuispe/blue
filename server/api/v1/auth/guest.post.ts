import { defineEventHandler, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { ErrorCodes } from '~/server/utils/errors'
import { createUserSession, isDevMode } from '~/server/services/auth/session'
import type { GuestRequest, GuestResponse } from '~/types/api/auth'
import { getUserByUsername } from '~/server/db/queries/users'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<GuestResponse> => {
    // Only allow guest login in dev mode
    if (!isDevMode()) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Guest login only available in development mode',
      })
    }

    // Find guest user
    const guestUser = await getUserByUsername('guest')

    if (!guestUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Guest user not found. Please visit setup endpoint first.',
      })
    }

    // Create session for guest user
    const sessionUser = {
      id: guestUser.id,
      username: guestUser.username,
      email: guestUser.email,
      isAdmin: guestUser.is_admin,
    }
    createUserSession(event, sessionUser)

    return apiSuccess({
      user: sessionUser,
      message: 'Logged in as guest',
    })
  })
)
