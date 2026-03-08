import { defineEventHandler, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { changeUsername } from '~/server/services/user/account'
import type { ApiSuccess } from '~/types/api/common'

interface ChangeUsernameBody {
  newUsername: string
}

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ message: string }>> => {
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

    try {
      await changeUsername(user.id, newUsername)
    } catch (error: any) {
      if (error.message === 'Username is already taken') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Username is already taken',
        })
      }
      throw error
    }

    return apiSuccess({ message: 'Username updated successfully' })
  })
)
