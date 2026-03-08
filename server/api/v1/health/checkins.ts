import { defineEventHandler, readBody, getQuery, getMethod, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getCheckins, createCheckin } from '~/server/services/health/checkins'
import type { CheckinsResponse, CheckinResponse } from '~/types/api/health'
import type { HealthCheckinInput } from '~/types/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<CheckinsResponse | CheckinResponse> => {
    const user = await requireAuth(event)
    const method = getMethod(event)
    const query = getQuery(event)

    if (method === 'GET') {
      const limit = parseInt(query.limit as string) || 30
      const checkins = await getCheckins(user.id, limit)
      return apiSuccess({ checkins })
    }

    if (method === 'POST') {
      const body = await readBody<HealthCheckinInput>(event)

      if (!body.weight && !body.chest && !body.waist) {
        throw createError({
          statusCode: 400,
          statusMessage: 'At least one measurement is required',
        })
      }

      const checkin = await createCheckin(user.id, body)
      return apiSuccess({ checkin })
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  })
)
