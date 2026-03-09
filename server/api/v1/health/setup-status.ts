import { defineEventHandler, getMethod, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getHealthProfile, getActiveHealthGoal } from '~/server/db/queries/health'

export default defineEventHandler(
  withErrorHandling(async event => {
    const user = await requireAuth(event)
    const method = getMethod(event)

    if (method !== 'GET') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed',
      })
    }

    const profile = await getHealthProfile(user.id)

    return apiSuccess({
      isSetup: !!profile,
      hasProfile: !!profile,
      hasGoals: !!(await getActiveHealthGoal(user.id)),
      message: profile ? 'Health module is set up' : 'Health setup required',
    })
  })
)
