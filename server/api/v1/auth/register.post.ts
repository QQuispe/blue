import { defineEventHandler, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { ErrorCodes } from '~/server/utils/errors'
import { createUserSession } from '~/server/services/auth/session'
import type { RegisterRequest, RegisterResponse } from '~/types/api/auth'
import {
  createUser,
  getUserByUsername,
  getUserByEmailWithPassword,
} from '~/server/db/queries/users'
import { pool } from '~/server/db/index.js'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<RegisterResponse> => {
    const body = await readBody<RegisterRequest>(event)
    const { username, password } = body

    if (!username || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username and password are required',
      })
    }

    if (password.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password must be at least 8 characters',
      })
    }

    // Check if this is the first user (make them admin)
    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    const isFirstUser = parseInt(userCount.rows[0].count) === 0

    // Check if username already exists
    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: ErrorCodes.AUTH_USERNAME_TAKEN,
      })
    }

    // Create user
    const user = await createUser(username, null, password)
    if (!user || !user.id || !user.username) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create user',
      })
    }

    // If first user, make them admin
    if (isFirstUser) {
      await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [user.id])
    }

    const isAdmin = isFirstUser ? true : user.is_admin || false

    // Auto-login after registration
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: isAdmin,
    }
    createUserSession(event, sessionUser)

    return apiSuccess({
      user: sessionUser,
      message: 'User created successfully',
    })
  })
)
