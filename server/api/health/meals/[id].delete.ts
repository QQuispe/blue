import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { deleteHealthMeal } from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)
  const path = url.pathname

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    const idStr = path.split('/meals/')[1]
    const mealId = parseInt(idStr)

    if (!mealId || isNaN(mealId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid meal ID' })
    }

    const deleted = await deleteHealthMeal(mealId, user.id)
    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Meal not found' })
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

    return { statusCode: 200, message: 'Meal deleted' }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Health meals delete request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete meal',
    })
  }
})
