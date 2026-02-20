import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
} from '~/server/db/queries/settings'

interface SettingsUpdate {
  currency?: string
  locale?: string
  timezone?: string
  theme?: string
  notifications_enabled?: boolean
  budget_alerts_enabled?: boolean
}

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)
    serverLogger.debug(`User authenticated: ${user.id}`)

    if (method === 'GET') {
      let settings = await getUserSettings(user.id)

      if (!settings) {
        settings = await createUserSettings(user.id)
        serverLogger.db('createUserSettings', 0, 1)
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        settings: {
          currency: settings.currency,
          locale: settings.locale,
          timezone: settings.timezone,
          theme: settings.theme,
          notificationsEnabled: settings.notifications_enabled,
          budgetAlertsEnabled: settings.budget_alerts_enabled,
        },
      }
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = await readBody<SettingsUpdate>(event)

      let settings = await getUserSettings(user.id)

      if (!settings) {
        settings = await createUserSettings(user.id, body)
      } else {
        settings = await updateUserSettings(user.id, body)
      }

      if (!settings) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update settings',
        })
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)
      serverLogger.success(`Settings updated for user ${user.id}`)

      return {
        statusCode: 200,
        settings: {
          currency: settings.currency,
          locale: settings.locale,
          timezone: settings.timezone,
          theme: settings.theme,
          notificationsEnabled: settings.notifications_enabled,
          budgetAlertsEnabled: settings.budget_alerts_enabled,
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
    serverLogger.error(`Settings request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process settings',
    })
  }
})
