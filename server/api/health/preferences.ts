import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { getHealthPreferences, createHealthPreferences } from '~/server/db/queries/health'
import type { HealthPreferencesInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (method === 'GET') {
      let preferences = await getHealthPreferences(user.id)

      if (!preferences) {
        preferences = await createHealthPreferences(user.id, {})
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        preferences: {
          id: preferences.id,
          dietaryRestrictions: preferences.dietary_restrictions,
          allergies: preferences.allergies,
          likedFoods: preferences.liked_foods,
          dislikedFoods: preferences.disliked_foods,
          mealCount: preferences.meal_count,
          equipment: preferences.equipment,
          workoutStyle: preferences.workout_style,
          workoutFrequency: preferences.workout_frequency,
          workoutDuration: preferences.workout_duration,
          createdAt: preferences.created_at,
          updatedAt: preferences.updated_at,
        },
      }
    }

    if (method === 'PUT' || method === 'PATCH') {
      const body = await readBody<HealthPreferencesInput>(event)
      const preferences = await createHealthPreferences(user.id, body)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        preferences: {
          id: preferences.id,
          dietaryRestrictions: preferences.dietary_restrictions,
          allergies: preferences.allergies,
          likedFoods: preferences.liked_foods,
          dislikedFoods: preferences.disliked_foods,
          mealCount: preferences.meal_count,
          equipment: preferences.equipment,
          workoutStyle: preferences.workout_style,
          workoutFrequency: preferences.workout_frequency,
          workoutDuration: preferences.workout_duration,
          createdAt: preferences.created_at,
          updatedAt: preferences.updated_at,
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
    serverLogger.error(`Health preferences request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process health preferences',
    })
  }
})
