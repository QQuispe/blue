import { getHealthPreferences, createHealthPreferences } from '~/server/db/queries/health'

export interface PreferencesData {
  id: number
  user_id: number
  dietary_restrictions: string[]
  preferred_cuisines: string[]
  meal_reminders: boolean
  workout_reminders: boolean
  created_at: string
  updated_at: string
}

/**
 * Get user preferences
 */
export async function getPreferences(userId: number): Promise<PreferencesData> {
  let prefs = await getHealthPreferences(userId)

  if (!prefs) {
    prefs = await createHealthPreferences(userId, {})
  }

  return {
    id: prefs.id,
    user_id: prefs.user_id,
    dietary_restrictions: prefs.dietary_restrictions || [],
    preferred_cuisines: prefs.preferred_cuisines || [],
    meal_reminders: prefs.meal_reminders ?? true,
    workout_reminders: prefs.workout_reminders ?? true,
    created_at: String(prefs.created_at),
    updated_at: String(prefs.updated_at),
  }
}
