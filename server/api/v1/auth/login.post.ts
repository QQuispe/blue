import { defineEventHandler, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { ErrorCodes } from '~/server/utils/errors'
import { createUserSession } from '~/server/services/auth/session'
import type { LoginBody, LoginResponse } from '~/types/api/auth'
import {
  getUserByUsernameWithPassword,
  getUserByEmailWithPassword,
  comparePassword,
} from '~/server/db/queries/users'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<LoginResponse> => {
    const body = await readBody<LoginBody>(event)

    if ((!body.username && !body.email) || !body.password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username/email and password are required',
      })
    }

    // Find user by username or email
    let user = null
    if (body.email) {
      user = await getUserByEmailWithPassword(body.email)
    }
    if (!user && body.username) {
      user = await getUserByUsernameWithPassword(body.username)
    }

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      })
    }

    if (!user.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: ErrorCodes.AUTH_ACCOUNT_DEACTIVATED,
      })
    }

    const isValidPassword = await comparePassword(body.password, user.password_hash!)
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      })
    }

    // Create session
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
    }
    createUserSession(event, sessionUser)

    return apiSuccess({
      user: sessionUser,
      message: 'Login successful',
    })
  })
)
