import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { pool } from '~/server/db/index'
import { hashPassword } from '~/server/db/queries/users'

interface ChangePasswordBody {
  newPassword: string
}

export default defineEventHandler(async event => {
  try {
    const user = await requireAuth(event)
    const body: ChangePasswordBody = await readBody(event)
    const { newPassword } = body

    if (!newPassword || typeof newPassword !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'New password is required',
      })
    }

    if (newPassword.length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password must be at least 6 characters long',
      })
    }

    const hashedPassword = await hashPassword(newPassword)

    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      hashedPassword,
      user.id,
    ])

    return {
      statusCode: 200,
      message: 'Password updated successfully',
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to change password',
    })
  }
})
