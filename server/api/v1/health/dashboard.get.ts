import { defineEventHandler, getQuery } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getDashboardData } from '~/server/services/health/dashboard'
import type { DashboardResponse } from '~/types/api/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<DashboardResponse> => {
    const user = await requireAuth(event)
    const query = getQuery(event)
    const dateParam = query.date as string | undefined

    const dashboard = await getDashboardData(user.id, dateParam)

    return apiSuccess(dashboard)
  })
)
