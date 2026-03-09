import { defineEventHandler, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { pool } from '~/server/db/index'

export default defineEventHandler(
  withErrorHandling(async event => {
    const user = await requireAuth(event)

    // Delete all health data for the user
    await pool.query('BEGIN')

    try {
      // Delete meal foods first (foreign key constraint)
      await pool.query(
        `DELETE FROM health_meal_foods WHERE meal_id IN 
         (SELECT id FROM health_meals WHERE user_id = $1)`,
        [user.id]
      )

      // Delete meals
      await pool.query('DELETE FROM health_meals WHERE user_id = $1', [user.id])

      // Delete workout sessions
      await pool.query('DELETE FROM health_workout_sessions WHERE user_id = $1', [user.id])

      // Delete workout plans
      await pool.query('DELETE FROM health_workout_plans WHERE user_id = $1', [user.id])

      // Delete meal plans
      await pool.query('DELETE FROM health_meal_plans WHERE user_id = $1', [user.id])

      // Delete preferences
      await pool.query('DELETE FROM health_preferences WHERE user_id = $1', [user.id])

      // Delete checkins
      await pool.query('DELETE FROM health_checkins WHERE user_id = $1', [user.id])

      // Delete goals
      await pool.query('DELETE FROM health_goals WHERE user_id = $1', [user.id])

      // Delete custom foods
      await pool.query('DELETE FROM health_foods WHERE user_id = $1', [user.id])

      // Delete saved meals
      await pool.query('DELETE FROM health_saved_meals WHERE user_id = $1', [user.id])

      // Finally delete profile
      await pool.query('DELETE FROM health_profiles WHERE user_id = $1', [user.id])

      await pool.query('COMMIT')

      return apiSuccess({ deleted: true })
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  })
)
