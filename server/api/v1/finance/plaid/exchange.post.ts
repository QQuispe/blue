import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { readBody } from 'h3'
import { exchangePublicToken } from '~/server/services/finance/plaid.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { publicToken } = body

  if (!publicToken) {
    throw new Error('Missing public token')
  }

  const data = await exchangePublicToken(publicToken, user.id)
  return apiSuccess(data)
})
