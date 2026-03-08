import { defineEventHandler, getQuery, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { searchFoods } from '~/server/services/health/foods'
import type { FoodsResponse } from '~/types/api/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<FoodsResponse> => {
    await requireAuth(event)
    const query = getQuery(event)
    const searchQuery = (query.query || query.q) as string

    if (!searchQuery) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Query parameter is required',
      })
    }

    const foods = await searchFoods(searchQuery)

    return apiSuccess({
      foods: foods.map(f => ({
        id: f.fdcId,
        user_id: undefined,
        name: f.name,
        brand: f.brand,
        barcode: null,
        serving_size: f.servingSize,
        serving_unit: f.servingUnit,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        fiber: f.fiber,
        sugar: null,
        sodium: null,
        is_verified: false,
        source: f.dataType,
        deleted_at: null,
        created_at: new Date().toISOString(),
      })),
      meta: {
        total: foods.length,
        page: 1,
        limit: foods.length,
        totalPages: 1,
      },
    })
  })
)
