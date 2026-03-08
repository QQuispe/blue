import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getBalanceData } from '~/server/services/finance/balance.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const data = await getBalanceData(user.id)
  return apiSuccess(data)
})
