import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { updateHealthCheckin } from '~/server/db/queries/health'

const formatDateField = (dateVal: any): string => {
  if (!dateVal) return ''
  // Handle different date formats from PostgreSQL
  if (typeof dateVal === 'object' && dateVal.toISOString) {
    return dateVal.toISOString().split('T')[0]
  }
  const str = String(dateVal)
  if (str.includes('T')) {
    return str.split('T')[0]
  }
  return str
}

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)
  const path = url.pathname

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    const idStr = path.split('/checkins/')[1]
    const checkinId = parseInt(idStr)

    if (!checkinId || isNaN(checkinId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid checkin ID' })
    }

    const body = await readBody<any>(event)

    const checkin = await updateHealthCheckin(checkinId, user.id, body)

    if (!checkin) {
      throw createError({ statusCode: 404, statusMessage: 'Checkin not found' })
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

    return {
      statusCode: 200,
      checkin: {
        id: checkin.id,
        checkinDate: formatDateField(checkin.checkin_date),
        weight: checkin.weight,
        chest: checkin.chest,
        waist: checkin.waist,
        hips: checkin.hips,
        biceps: checkin.biceps,
        thighs: checkin.thighs,
        notes: checkin.notes,
        createdAt: checkin.created_at,
      },
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Health checkins update request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update checkin',
    })
  }
})
