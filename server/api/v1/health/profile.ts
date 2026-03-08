import { defineEventHandler, readBody, getMethod, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getProfile, updateProfile } from '~/server/services/health/profile'
import type { ProfileResponse } from '~/types/api/health'
import type { ActivityLevel } from '~/types/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ProfileResponse> => {
    const user = await requireAuth(event)
    const method = getMethod(event)

    if (method === 'GET') {
      const profile = await getProfile(user.id)
      return apiSuccess({ profile })
    }

    if (method === 'PUT' || method === 'PATCH') {
      const body = await readBody<{
        weight?: number
        height?: number
        age?: number
        activity_level?: ActivityLevel
      }>(event)

      const profile = await updateProfile(user.id, body)
      return apiSuccess({ profile })
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  })
)
