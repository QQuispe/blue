import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { createLinkToken } from '~/server/services/finance/plaid.js'

export default withErrorHandling(async event => {
  await requireAuth(event)
  const data = await createLinkToken()
  return apiSuccess(data)
})
