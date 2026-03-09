import { defineEventHandler, readBody, getRouterParams, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { updateCustomFood } from '~/server/db/queries/health'
import type { ApiSuccess } from '~/types/api/common'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ food: any }>> => {
    const user = await requireAuth(event)
    const params = getRouterParams(event)
    const foodId = parseInt(params.id as string)

    if (!foodId || isNaN(foodId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid food ID',
      })
    }

    const body = await readBody<{
      name?: string
      brand?: string
      serving_size?: number
      serving_unit?: string
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
      fiber?: number
    }>(event)

    const food = await updateCustomFood(user.id, foodId, body)

    if (!food) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Food not found',
      })
    }

    return apiSuccess({
      food: {
        id: food.id,
        name: food.name,
        brand: food.brand,
        serving_size: food.serving_size,
        serving_unit: food.serving_unit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
      },
    })
  })
)
