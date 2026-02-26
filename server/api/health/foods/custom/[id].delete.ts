import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { deleteCustomFood } from '~/server/db/queries/health'

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

    const deleted = await deleteCustomFood(foodId, user.id, user.is_admin)

    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Food not found' })
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

    return { statusCode: 200, message: 'Food deleted' }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Custom foods delete request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete custom food',
    })
  }
})
