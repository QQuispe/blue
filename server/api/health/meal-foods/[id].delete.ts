import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { deleteMealFood, getMealFoodById } from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)
  const path = url.pathname

  console.log('[meal-foods.delete.ts] Received request:', method, path)

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    // DELETE /api/health/meal-foods/:id
    const idStr = path.split('/meal-foods/')[1]
    const mealFoodId = parseInt(idStr)

    if (!mealFoodId || isNaN(mealFoodId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid meal food ID' })
    }

    console.log('[meal-foods.delete.ts] Deleting meal-food:', mealFoodId)

    const mealFood = await getMealFoodById(mealFoodId)
    if (!mealFood) {
      throw createError({ statusCode: 404, statusMessage: 'Meal food not found' })
    }

    const result = await deleteMealFood(mealFoodId, mealFood.meal_id, user.id)

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

    return { statusCode: 200, message: 'Food deleted', result }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Health meal-foods request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process meal-foods',
    })
  }
})
