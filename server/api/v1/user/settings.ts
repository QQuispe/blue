import { defineEventHandler, getMethod, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getSettings, updateSettings } from '~/server/services/user/settings'
import type { ApiSuccess } from '~/types/api/common'

interface SettingsData {
  settings: {
    currency: string
    locale: string
    timezone: string
    theme: string
    notificationsEnabled: boolean
    budgetAlertsEnabled: boolean
  }
}

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<SettingsData>> => {
    const user = await requireAuth(event)
    const method = getMethod(event)

    if (method === 'GET') {
      const settings = await getSettings(user.id)
      return apiSuccess({ settings })
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = await readBody<{
        currency?: string
        locale?: string
        timezone?: string
        theme?: string
        notifications_enabled?: boolean
        budget_alerts_enabled?: boolean
      }>(event)

      const settings = await updateSettings(user.id, body)
      return apiSuccess({ settings })
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  })
)
