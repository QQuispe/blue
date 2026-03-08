import { readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { ErrorCodes } from '~/server/utils/errors'
import { revokeAccessToken, revokeFamily } from '~/server/services/auth/tokens'
import type { RevokeRequest, RevokeResponse } from '~/types/api/auth'

export default withErrorHandling(async (event): Promise<RevokeResponse> => {
  const { token, token_type_hint } = await readBody<RevokeRequest>(event)

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: ErrorCodes.MISSING_REQUIRED_FIELDS,
    })
  }

  if (token_type_hint === 'refresh_token') {
    // Revoke entire family — recommended logout path for native apps
    await revokeFamily(token)
  } else {
    // Default: revoke access token only
    await revokeAccessToken(token)
  }

  return apiSuccess({ revoked: true })
})
