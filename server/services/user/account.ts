import { pool } from '~/server/db/index'
import { hashPassword } from '~/server/db/queries/users'

/**
 * Change user password
 */
export async function changePassword(userId: number, newPassword: string): Promise<void> {
  const hashedPassword = await hashPassword(newPassword)

  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    hashedPassword,
    userId,
  ])
}

/**
 * Change username with validation
 */
export async function changeUsername(userId: number, newUsername: string): Promise<void> {
  // Check if username is taken
  const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [
    newUsername,
    userId,
  ])

  if (existingUser.rows.length > 0) {
    throw new Error('Username is already taken')
  }

  await pool.query('UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2', [
    newUsername,
    userId,
  ])
}

/**
 * Delete user account and all related data
 */
export async function deleteAccount(userId: number): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Delete all user-related data in proper order

    // Finance data
    await client.query(
      'DELETE FROM accounts WHERE item_id IN (SELECT id FROM items WHERE user_id = $1)',
      [userId]
    )
    await client.query('DELETE FROM items WHERE user_id = $1', [userId])
    await client.query('DELETE FROM user_bills WHERE user_id = $1', [userId])
    await client.query('DELETE FROM detected_bill_patterns WHERE user_id = $1', [userId])
    await client.query('DELETE FROM net_worth_snapshots WHERE user_id = $1', [userId])
    await client.query('DELETE FROM budgets WHERE user_id = $1', [userId])

    // Health data
    await client.query(
      'DELETE FROM health_meal_foods WHERE meal_id IN (SELECT id FROM health_meals WHERE user_id = $1)',
      [userId]
    )
    await client.query('DELETE FROM health_meals WHERE user_id = $1', [userId])
    await client.query('DELETE FROM health_workout_sessions WHERE user_id = $1', [userId])
    await client.query('DELETE FROM health_workout_plans WHERE user_id = $1', [userId])
    await client.query('DELETE FROM health_meal_plans WHERE user_id = $1', [userId])
    await client.query('DELETE FROM health_preferences WHERE user_id = $1', [userId])
    await client.query('DELETE FROM health_checkins WHERE user_id = $1', [userId])
    await client.query('DELETE FROM health_goals WHERE user_id = $1', [userId])
    await client.query('DELETE FROM health_profiles WHERE user_id = $1', [userId])
    await client.query(
      'DELETE FROM health_foods WHERE id IN (SELECT id FROM health_foods WHERE user_id = $1)',
      [userId]
    )

    // User settings
    await client.query('DELETE FROM user_settings WHERE user_id = $1', [userId])

    // Finally, delete the user
    await client.query('DELETE FROM users WHERE id = $1', [userId])

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
