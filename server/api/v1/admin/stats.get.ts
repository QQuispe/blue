import { defineEventHandler } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAdmin } from '~/server/utils/auth'
import { getAdminStats } from '~/server/services/admin/stats'
import type { AdminStatsResponse } from '~/types/api/admin'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<AdminStatsResponse> => {
    // Verify admin access
    await requireAdmin(event)

    const stats = await getAdminStats()

    return apiSuccess(stats)
  })
)
