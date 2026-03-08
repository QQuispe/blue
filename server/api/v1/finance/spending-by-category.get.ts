import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getSpendingByCategory } from '~/server/services/finance/spending.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const data = await getSpendingByCategory(user.id)
  return apiSuccess(data)
})
