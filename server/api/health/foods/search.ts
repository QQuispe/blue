import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  searchHealthFoods,
  getHealthFoodByBarcode,
  createHealthFood,
} from '~/server/db/queries/health'
import type { HealthFoodInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (method === 'GET') {
      const query = url.searchParams.get('q') || ''
      const barcode = url.searchParams.get('barcode')
      const limit = parseInt(url.searchParams.get('limit') || '20')

      if (barcode) {
        const food = await getHealthFoodByBarcode(barcode)

        const duration = Date.now() - startTime
        serverLogger.api(method, url.pathname, 200, duration, user.id)

        return {
          statusCode: 200,
          food: food
            ? {
                id: food.id,
                name: food.name,
                brand: food.brand,
                barcode: food.barcode,
                servingSize: food.serving_size,
                servingUnit: food.serving_unit,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
                fiber: food.fiber,
                sugar: food.sugar,
                sodium: food.sodium,
                isVerified: food.is_verified,
                source: food.source,
              }
            : null,
        }
      }

      if (!query) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Search query is required',
        })
      }

      const foods = await searchHealthFoods(query, limit)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        foods: foods.map(f => ({
          id: f.id,
          name: f.name,
          brand: f.brand,
          barcode: f.barcode,
          servingSize: f.serving_size,
          servingUnit: f.serving_unit,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          fiber: f.fiber,
          sugar: f.sugar,
          sodium: f.sodium,
          isVerified: f.is_verified,
          source: f.source,
        })),
      }
    }

    if (method === 'POST') {
      const body = await readBody<HealthFoodInput>(event)

      if (!body.name || body.calories === undefined) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Name and calories are required',
        })
      }

      const food = await createHealthFood({
        ...body,
        source: 'manual',
      })

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 201, duration, user.id)

      return {
        statusCode: 201,
        food: {
          id: food.id,
          name: food.name,
          brand: food.brand,
          barcode: food.barcode,
          servingSize: food.serving_size,
          servingUnit: food.serving_unit,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
          sodium: food.sodium,
          isVerified: food.is_verified,
          source: food.source,
        },
      }
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Health foods request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process health foods',
    })
  }
})
