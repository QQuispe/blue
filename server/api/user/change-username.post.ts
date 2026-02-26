import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { pool } from '~/server/db/index'

interface ChangeUsernameBody {
  newUsername: string
}

export default defineEventHandler(async event => {
  try {
    const user = await requireAuth(event)
    const body: ChangeUsernameBody = await readBody(event)
    const { newUsername } = body

    if (!newUsername || typeof newUsername !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'New username is required',
      })
    }

    if (newUsername.length < 2 || newUsername.length > 14) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username must be between 2 and 14 characters',
      })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username can only contain letters, numbers, and underscores',
      })
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [
      newUsername,
      user.id,
    ])

    if (existingUser.rows.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username is already taken',
      })
    }

    await pool.query('UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2', [
      newUsername,
      user.id,
    ])

    return {
      statusCode: 200,
      message: 'Username updated successfully',
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to change username',
    })
  }
})
