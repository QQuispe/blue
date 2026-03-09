import { defineEventHandler, readBody } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getHealthPreferences, createHealthPreferences } from '~/server/db/queries/health'
import type { HealthPreferencesInput } from '~/types/health'

export default defineEventHandler(
  withErrorHandling(async (event) => {
    const user = await requireAuth(event)
    const method = event.method

    if (method === 'GET') {
      let preferences = await getHealthPreferences(user.id)

      if (!preferences) {
        preferences = await createHealthPreferences(user.id, {})
      }

      return apiSuccess({
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
      })
    }

    if (method === 'PUT' || method === 'PATCH') {
      const body = await readBody<HealthPreferencesInput>(event)
      const preferences = await createHealthPreferences(user.id, body)

      return apiSuccess({
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
      })
    }
  })
)
