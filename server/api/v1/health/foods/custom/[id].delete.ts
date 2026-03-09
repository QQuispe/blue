import { defineEventHandler, getRouterParams, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { deleteCustomFood } from '~/server/db/queries/health'
import type { ApiSuccess } from '~/types/api/common'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ deleted: boolean }>> => {
    const user = await requireAuth(event)
    const params = getRouterParams(event)
    const foodId = parseInt(params.id as string)

    if (!foodId || isNaN(foodId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid food ID',
      })
    }

    const deleted = await deleteCustomFood(user.id, foodId)

    if (!deleted) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Food not found',
      })
    }

    return apiSuccess({ deleted: true })
  })
)
