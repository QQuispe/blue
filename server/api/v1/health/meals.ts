import { defineEventHandler, getQuery, getMethod, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getMeals, createMeal } from '~/server/services/health/meals'
import type { MealsResponse, MealResponse } from '~/types/api/health'
import type { HealthMealInput } from '~/types/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<MealsResponse | MealResponse> => {
    const user = await requireAuth(event)
    const method = getMethod(event)
    const query = getQuery(event)

    if (method === 'GET') {
      const date = query.date as string | undefined
      const meals = await getMeals(user.id, date)
      return apiSuccess({ meals })
    }

    if (method === 'POST') {
      const body = await readBody<HealthMealInput>(event)

      if (!body.meal_type || !body.foods || body.foods.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'meal_type and at least one food are required',
        })
      }

      const meal = await createMeal(user.id, body)
      return apiSuccess({ meal })
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  })
)
