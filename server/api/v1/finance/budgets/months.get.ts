import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getAvailableMonths } from '~/server/services/finance/budgets.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const months = await getAvailableMonths(user.id)
  return apiSuccess({ months })
})
