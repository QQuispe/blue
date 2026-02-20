import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { getHealthCheckins, createHealthCheckin } from '~/server/db/queries/health'
import type { HealthCheckinInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '30')
      const checkins = await getHealthCheckins(user.id, limit)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        checkins: checkins.map(c => ({
          id: c.id,
          checkinDate: c.checkin_date,
          weight: c.weight,
          chest: c.chest,
          waist: c.waist,
          hips: c.hips,
          biceps: c.biceps,
          thighs: c.thighs,
          notes: c.notes,
          createdAt: c.created_at,
        })),
      }
    }

    if (method === 'POST') {
      const body = await readBody<HealthCheckinInput>(event)

      if (!body.weight && !body.chest && !body.waist) {
        throw createError({
          statusCode: 400,
          statusMessage: 'At least one measurement is required',
        })
      }

      const checkin = await createHealthCheckin(user.id, body)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 201, duration, user.id)

      return {
        statusCode: 201,
        checkin: {
          id: checkin.id,
          checkinDate: checkin.checkin_date,
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
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Health checkins request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process health checkins',
    })
  }
})
