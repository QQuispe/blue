import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const method = 'GET'

  serverLogger.info(`→ ${method} /api/health/foods/search - Starting request`)

  try {
    const user = await requireAuth(event)
    const config = useRuntimeConfig()
    const apiKey = config.usdaApiKey

    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'USDA API key not configured',
      })
    }

    const query = getQuery(event)
    const searchQuery = (query.query || query.q) as string

    if (!searchQuery) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Query parameter is required',
      })
    }

    const response = await fetch(
      `${USDA_API_BASE}/foods/search?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}&dataType=Foundation,SR%20Legacy&pageSize=25`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `USDA API error: ${response.statusText}`,
      })
    }

    const data = await response.json()

    const duration = Date.now() - startTime
    serverLogger.api(method, '/api/health/foods/search', 200, duration, user.id)

    const nutrientIds = {
      calories: 1008,
      protein: 1003,
      carbs: 1005,
      fat: 1004,
      fiber: 1079,
    }

    return {
      statusCode: 200,
      foods:
        data.foods?.map((food: any) => ({
          fdcId: food.fdcId,
          name: food.description,
          brand: food.brandOwner || food.brandName || null,
          servingSize: food.servingSize || 100,
          servingUnit: food.servingSizeUnit || 'g',
          calories:
            food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.calories)?.value || 0,
          protein:
            food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.protein)?.value || 0,
          carbs:
            food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.carbs)?.value || 0,
          fat: food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.fat)?.value || 0,
          fiber:
            food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.fiber)?.value || 0,
          dataType: food.dataType,
          ingredients: food.ingredients,
        })) || [],
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, '/api/health/foods/search', error.statusCode || 500, duration)
    serverLogger.error(`USDA foods search failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to search foods',
    })
  }
})
