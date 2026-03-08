import { defineEventHandler, readBody, getRouterParams, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { updateCheckin } from '~/server/services/health/checkins'
import type { CheckinResponse } from '~/types/api/health'
import type { HealthCheckinInput } from '~/types/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<CheckinResponse> => {
    const user = await requireAuth(event)
    const params = getRouterParams(event)
    const checkinId = parseInt(params.id as string)

    if (!checkinId || isNaN(checkinId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid checkin ID',
      })
    }

    const body = await readBody<Partial<HealthCheckinInput>>(event)
    const checkin = await updateCheckin(user.id, checkinId, body)

    if (!checkin) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Checkin not found',
      })
    }

    return apiSuccess({ checkin })
  })
)
