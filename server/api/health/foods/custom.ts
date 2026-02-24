import { defineEventHandler, getRequestURL, getMethod, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { getCustomFoods, createCustomFood, deleteCustomFood } from '~/server/db/queries/health'
import type { HealthFoodInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)
    const path = url.pathname
    const idMatch = path.match(/\/api\/health\/foods\/custom\/(\d+)/)
    const id = idMatch ? parseInt(idMatch[1]) : null

    if (method === 'GET' && !id) {
      const foods = await getCustomFoods(user.id)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        foods: foods.map(f => ({
          id: f.id,
          name: f.name,
          brand: f.brand,
          serving_size: Number(f.serving_size) || 100,
          serving_unit: f.serving_unit || 'g',
          calories: Number(f.calories) || 0,
          protein: Number(f.protein) || 0,
          carbs: Number(f.carbs) || 0,
          fat: Number(f.fat) || 0,
          fiber: Number(f.fiber) || 0,
        })),
      }
    }

    if (method === 'POST' && !id) {
      const body = await readBody<HealthFoodInput>(event)

      if (!body.name) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Name is required',
        })
      }

      const food = await createCustomFood(user.id, body)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 201, duration, user.id)

      return {
        statusCode: 201,
        food: {
          id: food.id,
          name: food.name,
          brand: food.brand,
          serving_size: Number(food.serving_size) || 100,
          serving_unit: food.serving_unit || 'g',
          calories: Number(food.calories) || 0,
          protein: Number(food.protein) || 0,
          carbs: Number(food.carbs) || 0,
          fat: Number(food.fat) || 0,
          fiber: Number(food.fiber) || 0,
        },
      }
    }

    if (method === 'DELETE' && id) {
      const deleted = await deleteCustomFood(id, user.id)

      if (!deleted) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Food not found',
        })
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        message: 'Food deleted',
      }
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Custom foods request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process custom foods',
    })
  }
})
