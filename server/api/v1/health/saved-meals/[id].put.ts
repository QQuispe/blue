import { defineEventHandler, readBody, getRouterParams, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { updateExistingSavedMeal } from '~/server/services/health/savedMeals'
import type { ApiSuccess } from '~/types/api/common'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ savedMeal: any }>> => {
    const user = await requireAuth(event)
    const params = getRouterParams(event)
    const mealId = parseInt(params.id as string)

    if (!mealId || isNaN(mealId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid saved meal ID',
      })
    }

    const body = await readBody<any>(event)
    const meal = await updateExistingSavedMeal(mealId, user.id, body)

    if (!meal) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Saved meal not found',
      })
    }

    return apiSuccess({ savedMeal: meal })
  })
)
