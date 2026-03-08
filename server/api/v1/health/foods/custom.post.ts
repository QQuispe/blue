import { defineEventHandler, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { createNewCustomFood } from '~/server/services/health/customFoods'
import type { FoodResponse } from '~/types/api/health'
import type { HealthFoodInput } from '~/types/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<FoodResponse> => {
    const user = await requireAuth(event)
    const body = await readBody<HealthFoodInput>(event)

    if (!body.name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Name is required',
      })
    }

    const food = await createNewCustomFood(user.id, body)

    return apiSuccess({
      food: {
        id: food.id,
        user_id: food.user_id ?? undefined,
        name: food.name,
        brand: food.brand,
        barcode: null,
        serving_size: food.serving_size,
        serving_unit: food.serving_unit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: null,
        sodium: null,
        is_verified: false,
        source: 'custom',
        deleted_at: null,
        created_at: new Date().toISOString(),
      },
    })
  })
)
