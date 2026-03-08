import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getQuery } from 'h3'
import { getTransactions } from '~/server/services/finance/transactions.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 25
  const search = query.search as string | undefined
  const accountId = query.accountId ? parseInt(query.accountId as string) : undefined
  const datePreset = query.datePreset as string | undefined

  const sortParts = ((query.sort as string) || 'date-desc').split('-')
  const sortField = sortParts[0] as 'date' | 'amount' | 'name'
  const sortDirection = sortParts[1] === 'asc' ? 'asc' : 'desc'

  const data = await getTransactions(
    user.id,
    page,
    limit,
    search,
    accountId,
    datePreset,
    sortField,
    sortDirection
  )

  return apiSuccess(data)
})
