import { defineEventHandler, getRouterParams, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { deleteMealFood } from '~/server/db/queries/health'
import type { ApiSuccess } from '~/types/api/common'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ deleted: boolean }>> => {
    const user = await requireAuth(event)
    const params = getRouterParams(event)
    const mealFoodId = parseInt(params.id as string)

    if (!mealFoodId || isNaN(mealFoodId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid meal food ID',
      })
    }

    const deleted = await deleteMealFood(mealFoodId, 0, user.id) // mealId=0 since we don't have it in params

    if (!deleted) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Meal food not found',
      })
    }

    return apiSuccess({ deleted: true })
  })
)
