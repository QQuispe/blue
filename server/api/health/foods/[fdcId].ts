import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const method = 'GET'

  serverLogger.info(`→ ${method} /api/health/foods/:fdcId - Starting request`)

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

    const fdcId = getRouterParam(event, 'fdcId')

    if (!fdcId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'FDC ID is required',
      })
    }

    const response = await fetch(`${USDA_API_BASE}/food/${fdcId}?api_key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `USDA API error: ${response.statusText}`,
      })
    }

    const data = await response.json()

    const duration = Date.now() - startTime
    serverLogger.api(method, '/api/health/foods/:fdcId', 200, duration, user.id)

    return {
      statusCode: 200,
      food: {
        fdcId: data.fdcId,
        description: data.description,
        dataType: data.dataType,
        brandOwner: data.brandOwner,
        brandName: data.brandName,
        ingredients: data.ingredients,
        servingSize: data.servingSize,
        servingSizeUnit: data.servingSizeUnit,
        nutrients: data.foodNutrients?.reduce((acc: any, nutrient: any) => {
          acc[nutrient.nutrientId] = {
            name: nutrient.nutrientName,
            value: nutrient.value,
            unit: nutrient.unitName,
          }
          return acc
        }, {}),
      },
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, '/api/health/foods/:fdcId', error.statusCode || 500, duration)
    serverLogger.error(`USDA food details failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get food details',
    })
  }
})
