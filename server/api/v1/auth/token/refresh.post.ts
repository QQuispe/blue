import { readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { ErrorCodes } from '~/server/utils/errors'
import { rotateRefreshToken } from '~/server/services/auth/tokens'
import type { RefreshRequest, RefreshResponse } from '~/types/api/auth'

export default withErrorHandling(async (event): Promise<RefreshResponse> => {
  const { refreshToken } = await readBody<RefreshRequest>(event)

  if (!refreshToken) {
    throw createError({
      statusCode: 400,
      statusMessage: ErrorCodes.MISSING_REQUIRED_FIELDS,
    })
  }

  const tokens = await rotateRefreshToken(refreshToken)

  return apiSuccess({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt.toISOString(),
  })
})
