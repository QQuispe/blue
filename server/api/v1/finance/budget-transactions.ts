import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getQuery } from 'h3'
import { getBudgetTransactions } from '~/server/services/finance/budgetTransactions.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const method = event.node.req.method
  const query = getQuery(event)

  if (method === 'GET') {
    const category = query.category as string
    const startDate = query.startDate as string
    const endDate = query.endDate as string

    if (!category || !startDate || !endDate) {
      return apiSuccess({ transactions: [] })
    }

    const data = await getBudgetTransactions(user.id, category, startDate, endDate)
    return apiSuccess(data)
  }

  if (method === 'POST') {
    // POST handling for budget transactions if needed
    throw new Error('Not implemented')
  }

  throw new Error('Method not allowed')
})
