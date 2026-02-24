import { defineEventHandler, getRequestURL, getMethod, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { getRecentFoods } from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const foods = await getRecentFoods(user.id, limit)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        foods: foods.map(f => ({
          food_name: f.food_name,
          food_id: f.food_id,
          calories: Math.round(Number(f.calories) || 0),
          protein: Math.round(Number(f.protein) || 0),
          carbs: Math.round(Number(f.carbs) || 0),
          fat: Math.round(Number(f.fat) || 0),
          last_servings: Number(f.last_servings) || 1,
          meal_date: f.meal_date,
          meal_type: f.meal_type,
        })),
      }
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Recent foods request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get recent foods',
    })
  }
})
