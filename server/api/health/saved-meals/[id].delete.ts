import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { deleteSavedMeal } from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)
  const path = url.pathname

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    const idStr = path.split('/saved-meals/')[1]
    const mealId = parseInt(idStr)

    if (!mealId || isNaN(mealId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid saved meal ID' })
    }

    const result = await deleteSavedMeal(mealId, user.id, user.is_admin)

    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Saved meal not found' })
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

    return { statusCode: 200, message: 'Saved meal deleted' }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Health saved-meals delete request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete saved meal',
    })
  }
})
