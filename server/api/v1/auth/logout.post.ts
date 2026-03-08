import { defineEventHandler, getMethod, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { clearUserSession } from '~/server/services/auth/session'
import type { LogoutResponse } from '~/types/api/auth'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<LogoutResponse> => {
    const method = getMethod(event)

    if (method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed. Use POST for logout.',
      })
    }

    clearUserSession(event)

    return apiSuccess({
      success: true,
    })
  })
)
