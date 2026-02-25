import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { updateCustomFood } from '~/server/db/queries/health'
import type { HealthFoodInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)
  const path = url.pathname

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    const idStr = path.split('/custom/')[1]
    const foodId = parseInt(idStr)

    if (!foodId || isNaN(foodId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid food ID' })
    }

    const body = await readBody<HealthFoodInput>(event)

    const updated = await updateCustomFood(foodId, user.id, body)

    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: 'Food not found' })
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

    return {
      statusCode: 200,
      food: {
        id: updated.id,
        name: updated.name,
        brand: updated.brand,
        serving_size: Number(updated.serving_size) || 100,
        serving_unit: updated.serving_unit || 'g',
        calories: Number(updated.calories) || 0,
        protein: Number(updated.protein) || 0,
        carbs: Number(updated.carbs) || 0,
        fat: Number(updated.fat) || 0,
        fiber: Number(updated.fiber) || 0,
      },
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Custom foods update request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update custom food',
    })
  }
})
