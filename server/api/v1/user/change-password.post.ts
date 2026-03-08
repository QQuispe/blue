import { defineEventHandler, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { changePassword } from '~/server/services/user/account'
import type { ApiSuccess } from '~/types/api/common'

interface ChangePasswordBody {
  newPassword: string
}

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ message: string }>> => {
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

    await changePassword(user.id, newPassword)

    return apiSuccess({ message: 'Password updated successfully' })
  })
)
