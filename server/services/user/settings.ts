import {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
} from '~/server/db/queries/settings'

export interface UserSettings {
  currency: string
  locale: string
  timezone: string
  theme: string
  notificationsEnabled: boolean
  budgetAlertsEnabled: boolean
}

export interface SettingsUpdate {
  currency?: string
  locale?: string
  timezone?: string
  theme?: string
  notifications_enabled?: boolean
  budget_alerts_enabled?: boolean
}

/**
 * Get user settings
 */
export async function getSettings(userId: number): Promise<UserSettings> {
  let settings = await getUserSettings(userId)

  if (!settings) {
    settings = await createUserSettings(userId)
  }

  return {
    currency: settings.currency,
    locale: settings.locale,
    timezone: settings.timezone,
    theme: settings.theme,
    notificationsEnabled: settings.notifications_enabled,
    budgetAlertsEnabled: settings.budget_alerts_enabled,
  }
}

/**
 * Update user settings
 */
export async function updateSettings(userId: number, data: SettingsUpdate): Promise<UserSettings> {
  let settings = await getUserSettings(userId)

  if (!settings) {
    settings = await createUserSettings(userId, data)
  } else {
    settings = await updateUserSettings(userId, data)
  }

  if (!settings) {
    throw new Error('Failed to update settings')
  }

  return {
    currency: settings.currency,
    locale: settings.locale,
    timezone: settings.timezone,
    theme: settings.theme,
    notificationsEnabled: settings.notifications_enabled,
    budgetAlertsEnabled: settings.budget_alerts_enabled,
  }
}
