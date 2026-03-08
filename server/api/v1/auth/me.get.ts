import { defineEventHandler } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { getSessionFromCookie, clearUserSession } from '~/server/services/auth/session'
import { getUserById } from '~/server/db/queries/users'
import type { MeResponse } from '~/types/api/auth'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<MeResponse> => {
    const session = getSessionFromCookie(event)

    if (!session) {
      return apiSuccess({ user: null })
    }

    const user = await getUserById(session.userId)

    if (!user || !user.is_active) {
      clearUserSession(event)
      return apiSuccess({ user: null })
    }

    return apiSuccess({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin,
      },
    })
  })
)
