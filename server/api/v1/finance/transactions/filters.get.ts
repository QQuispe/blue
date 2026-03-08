import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getTransactionFilters } from '~/server/services/finance/transactions.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const data = await getTransactionFilters(user.id)
  return apiSuccess(data)
})
