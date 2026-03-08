import { readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { ErrorCodes } from '~/server/utils/errors'
import { issueTokenPair } from '~/server/services/auth/tokens'
import {
  getUserByUsernameWithPassword,
  getUserByEmailWithPassword,
  comparePassword,
} from '~/server/db/queries/users'
import type { TokenRequest, TokenResponse } from '~/types/api/auth'

export default withErrorHandling(async (event): Promise<TokenResponse> => {
  const body = await readBody<TokenRequest>(event)
  const { username, email, password, clientName = 'Android App', clientId = 'android' } = body

  if ((!username && !email) || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: ErrorCodes.MISSING_REQUIRED_FIELDS,
    })
  }

  let user = null
  if (email) user = await getUserByEmailWithPassword(email)
  if (!user && username) user = await getUserByUsernameWithPassword(username)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_INVALID_CREDENTIALS,
    })
  }

  if (!user.is_active) {
    throw createError({
      statusCode: 403,
      statusMessage: ErrorCodes.AUTH_ACCOUNT_DEACTIVATED,
    })
  }

  const isValid = await comparePassword(password, user.password_hash!)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: ErrorCodes.AUTH_INVALID_CREDENTIALS,
    })
  }

  const tokens = await issueTokenPair(user.id, clientName, clientId)

  return apiSuccess({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt.toISOString(),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
    },
  })
})
