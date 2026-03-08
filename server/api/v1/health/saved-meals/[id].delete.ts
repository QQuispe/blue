import { defineEventHandler, getRouterParams, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { removeSavedMeal } from '~/server/services/health/savedMeals'
import type { ApiSuccess } from '~/types/api/common'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ deleted: boolean }>> => {
    const user = await requireAuth(event)
    const params = getRouterParams(event)
    const id = parseInt(params.id as string)

    if (!id || isNaN(id)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid saved meal ID' })
    }

    const deleted = await removeSavedMeal(id, user.id)
    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Meal not found' })
    }

    return apiSuccess({ deleted: true })
  })
)
