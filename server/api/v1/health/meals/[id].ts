import { defineEventHandler, readBody, getRouterParams, getMethod, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { updateMeal, deleteMeal } from '~/server/services/health/meals'
import type { MealResponse } from '~/types/api/health'
import type { HealthMealInput } from '~/types/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<MealResponse> => {
    const user = await requireAuth(event)
    const params = getRouterParams(event)
    const mealId = parseInt(params.id as string)
    const method = getMethod(event)

    if (!mealId || isNaN(mealId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid meal ID',
      })
    }

    if (method === 'PUT') {
      const body = await readBody<Partial<HealthMealInput>>(event)
      const meal = await updateMeal(user.id, mealId, body)

      if (!meal) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Meal not found',
        })
      }

      return apiSuccess({ meal })
    }

    if (method === 'DELETE') {
      const deleted = await deleteMeal(user.id, mealId)

      if (!deleted) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Meal not found',
        })
      }

      // Return the last known state or empty meal object
      return apiSuccess({
        meal: {
          id: mealId,
          user_id: user.id,
          meal_type: 'breakfast',
          meal_date: new Date().toISOString().split('T')[0],
          foods: [],
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0,
          notes: null,
          created_at: new Date().toISOString(),
        },
      })
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  })
)
