import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { syncLiabilities } from '~/server/services/finance/liabilities.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const data = await syncLiabilities(user.id)
  return apiSuccess(data, { message: 'Liabilities synced successfully' })
})
