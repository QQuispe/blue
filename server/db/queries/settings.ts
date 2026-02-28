import { pool } from '../index.js'
import type { UserSettings, QueryResult } from '~/types/database.js'

export async function getUserSettings(userId: number): Promise<QueryResult<UserSettings>> {
  const result = await pool.query(`SELECT * FROM user_settings WHERE user_id = $1`, [userId])
  return result.rows[0] || null
}

export async function createUserSettings(
  userId: number,
  settings: Partial<UserSettings> = {}
): Promise<UserSettings> {
  const result = await pool.query(
    `INSERT INTO user_settings (user_id, currency, locale, timezone, theme, notifications_enabled, budget_alerts_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       currency = COALESCE($2, user_settings.currency),
       locale = COALESCE($3, user_settings.locale),
       timezone = COALESCE($4, user_settings.timezone),
       theme = COALESCE($5, user_settings.theme),
       notifications_enabled = COALESCE($6, user_settings.notifications_enabled),
       budget_alerts_enabled = COALESCE($7, user_settings.budget_alerts_enabled),
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      userId,
      settings.currency || 'USD',
      settings.locale || 'en-US',
      settings.timezone || 'America/New_York',
      settings.theme || 'dark',
      settings.notifications_enabled ?? true,
      settings.budget_alerts_enabled ?? true,
    ]
  )
  return result.rows[0]
}

export async function updateUserSettings(
  userId: number,
  settings: Partial<UserSettings>
): Promise<QueryResult<UserSettings>> {
  const { currency, locale, timezone, theme, notifications_enabled, budget_alerts_enabled } =
    settings

  const result = await pool.query(
    `UPDATE user_settings
     SET currency = COALESCE($2, currency),
         locale = COALESCE($3, locale),
         timezone = COALESCE($4, timezone),
         theme = COALESCE($5, theme),
         notifications_enabled = COALESCE($6, notifications_enabled),
         budget_alerts_enabled = COALESCE($7, budget_alerts_enabled),
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [userId, currency, locale, timezone, theme, notifications_enabled, budget_alerts_enabled]
  )
  return result.rows[0] || null
}

export async function updateUserCurrency(
  userId: number,
  currency: string
): Promise<QueryResult<UserSettings>> {
  const result = await pool.query(
    `UPDATE user_settings
     SET currency = $2, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [userId, currency]
  )
  return result.rows[0] || null
}

export async function getUserCurrency(userId: number): Promise<string> {
  const result = await pool.query(`SELECT currency FROM user_settings WHERE user_id = $1`, [userId])
  return result.rows[0]?.currency || 'USD'
}
