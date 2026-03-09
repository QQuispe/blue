import { defineEventHandler, getRouterParams, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { deleteHealthCheckin } from '~/server/db/queries/health'
import type { ApiSuccess } from '~/types/api/common'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ deleted: boolean }>> => {
    const user = await requireAuth(event)
    const params = getRouterParams(event)
    const checkinId = parseInt(params.id as string)

    if (!checkinId || isNaN(checkinId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid checkin ID',
      })
    }

    const deleted = await deleteHealthCheckin(user.id, checkinId)

    if (!deleted) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Checkin not found',
      })
    }

    return apiSuccess({ deleted: true })
  })
)
