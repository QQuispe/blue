import { defineEventHandler, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getAllCustomFoods, getFoodsByIdList } from '~/server/services/health/customFoods'
import type { FoodsResponse } from '~/types/api/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<FoodsResponse> => {
    await requireAuth(event)

    // Handle POST with body containing ids
    if (event.method === 'POST') {
      const body = await readBody<{ ids: number[] }>(event)

      if (body && 'ids' in body && Array.isArray(body.ids)) {
        const foods = await getFoodsByIdList(body.ids)
        return apiSuccess({
          foods: foods.map(f => ({
            id: f.id,
            user_id: f.user_id ?? undefined,
            name: f.name,
            brand: f.brand,
            barcode: null,
            serving_size: f.serving_size,
            serving_unit: f.serving_unit,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
            fiber: f.fiber,
            sugar: null,
            sodium: null,
            is_verified: false,
            source: 'custom',
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
      }

      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body',
      })
    }

    // GET request
    const foods = await getAllCustomFoods()
    return apiSuccess({
      foods: foods.map(f => ({
        id: f.id,
        user_id: f.user_id ?? undefined,
        name: f.name,
        brand: f.brand,
        barcode: null,
        serving_size: f.serving_size,
        serving_unit: f.serving_unit,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        fiber: f.fiber,
        sugar: null,
        sodium: null,
        is_verified: false,
        source: 'custom',
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
