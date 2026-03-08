import { defineEventHandler, getMethod, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getUserMealPlans, createMealPlan } from '~/server/services/health/mealPlans'
import type { ApiSuccess } from '~/types/api/common'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<any>> => {
    const user = await requireAuth(event)
    const method = getMethod(event)

    if (method === 'GET') {
      const { activePlan, plans } = await getUserMealPlans(user.id)
      return apiSuccess({ activePlan, plans })
    }

    if (method === 'POST') {
      const body = await readBody<any>(event)
      const plan = await createMealPlan(user.id, body)
      return apiSuccess({ plan })
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  })
)
