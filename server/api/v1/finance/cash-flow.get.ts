import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getCashFlowData } from '~/server/services/finance/cashFlow.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const data = await getCashFlowData(user.id)
  return apiSuccess(data)
})
