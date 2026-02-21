import { defineEventHandler, getMethod, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { pool } from '~/server/db/index.js'

export default defineEventHandler(async event => {
  const method = getMethod(event)

  if (method !== 'DELETE') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed',
    })
  }

  const user = await requireAuth(event)

  // Tables with user_id column - can delete directly
  const directTables = [
    'health_profiles',
    'health_goals',
    'health_checkins',
    'health_meals',
    'health_preferences',
    'health_meal_plans',
    'health_workout_plans',
    'health_workout_sessions',
  ]

  // Junction table - delete via meals table
  const junctionTables = ['health_meal_foods']

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Delete from tables with user_id directly
    for (const table of directTables) {
      await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [user.id])
    }

    // Delete junction table via meals
    for (const table of junctionTables) {
      await client.query(
        `
        DELETE FROM ${table} 
        WHERE meal_id IN (SELECT id FROM health_meals WHERE user_id = $1)
      `,
        [user.id]
      )
    }

    await client.query('COMMIT')

    return { success: true, message: 'All health data deleted' }
  } catch (error: any) {
    await client.query('ROLLBACK')
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to delete health data: ${error.message}`,
    })
  } finally {
    client.release()
  }
})
