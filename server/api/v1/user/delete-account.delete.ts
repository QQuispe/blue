import { defineEventHandler, deleteCookie, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { deleteAccount } from '~/server/services/user/account'
import type { ApiSuccess } from '~/types/api/common'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ message: string }>> => {
    const user = await requireAuth(event)

    await deleteAccount(user.id)

    deleteCookie(event, 'auth_token')

    return apiSuccess({ message: 'Account deleted successfully' })
  })
)
