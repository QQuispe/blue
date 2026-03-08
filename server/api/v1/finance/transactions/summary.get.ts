import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getQuery } from 'h3'
import { getTransactionSummary } from '~/server/services/finance/transactions.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const search = query.search as string | undefined
  const accountId = query.accountId ? parseInt(query.accountId as string) : undefined
  const datePreset = query.datePreset as string | undefined

  const data = await getTransactionSummary(user.id, search, accountId, datePreset)
  return apiSuccess(data)
})
