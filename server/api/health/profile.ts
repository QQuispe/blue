import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  getHealthProfile,
  createHealthProfile,
  updateHealthProfile,
} from '~/server/db/queries/health'
import type { HealthProfileInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (method === 'GET') {
      let profile = await getHealthProfile(user.id)

      if (!profile) {
        profile = await createHealthProfile(user.id, {})
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        profile: {
          id: profile.id,
          weight: profile.weight,
          height: profile.height,
          age: profile.age,
          gender: profile.gender,
          activityLevel: profile.activity_level,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
      }
    }

    if (method === 'PUT' || method === 'PATCH') {
      const body = await readBody<HealthProfileInput>(event)
      let profile = await getHealthProfile(user.id)

      if (!profile) {
        profile = await createHealthProfile(user.id, body)
      } else {
        profile = await updateHealthProfile(user.id, body)
      }

      if (!profile) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update profile',
        })
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        profile: {
          id: profile.id,
          weight: profile.weight,
          height: profile.height,
          age: profile.age,
          gender: profile.gender,
          activityLevel: profile.activity_level,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
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
    serverLogger.error(`Health profile request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process health profile',
    })
  }
})
