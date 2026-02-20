import { defineEventHandler, createError, deleteCookie } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { pool } from '~/server/db/index'

export default defineEventHandler(async event => {
  const client = await pool.connect()

  try {
    const user = await requireAuth(event)

    await client.query('BEGIN')

    // Delete all user-related data in proper order

    // Finance data
    await client.query(
      'DELETE FROM accounts WHERE item_id IN (SELECT id FROM items WHERE user_id = $1)',
      [user.id]
    )
    await client.query('DELETE FROM items WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM user_bills WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM detected_bill_patterns WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM net_worth_snapshots WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM budgets WHERE user_id = $1', [user.id])

    // Health data
    await client.query(
      'DELETE FROM health_meal_foods WHERE meal_id IN (SELECT id FROM health_meals WHERE user_id = $1)',
      [user.id]
    )
    await client.query('DELETE FROM health_meals WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM health_workout_sessions WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM health_workout_plans WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM health_meal_plans WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM health_preferences WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM health_checkins WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM health_goals WHERE user_id = $1', [user.id])
    await client.query('DELETE FROM health_profiles WHERE user_id = $1', [user.id])
    await client.query(
      'DELETE FROM health_foods WHERE id IN (SELECT id FROM health_foods WHERE user_id = $1)',
      [user.id]
    )

    // User settings
    await client.query('DELETE FROM user_settings WHERE user_id = $1', [user.id])

    // Finally, delete the user
    await client.query('DELETE FROM users WHERE id = $1', [user.id])

    await client.query('COMMIT')

    deleteCookie(event, 'auth_token')

    return {
      statusCode: 200,
      message: 'Account deleted successfully',
    }
  } catch (error: any) {
    await client.query('ROLLBACK')

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete account',
    })
  } finally {
    client.release()
  }
})
