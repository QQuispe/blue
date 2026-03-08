import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getQuery } from 'h3'
import { getNetWorthData } from '~/server/services/finance/netWorth.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const timeframe = (query.timeframe as string) || '12m'
  const data = await getNetWorthData(user.id, timeframe)
  return apiSuccess(data)
})
