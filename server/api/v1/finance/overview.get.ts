import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getOverviewData } from '~/server/services/finance/overview.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const data = await getOverviewData(user.id)
  return apiSuccess(data)
})
