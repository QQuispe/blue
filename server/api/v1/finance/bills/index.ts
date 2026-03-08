import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getQuery, readBody } from 'h3'
import {
  getBills,
  createBill,
  updateBill,
  verifyBillOwnership,
} from '~/server/services/finance/bills.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const method = event.node.req.method
  const query = getQuery(event)

  if (method === 'GET') {
    const includeInactive = query.includeInactive === 'true'
    const data = await getBills(user.id, includeInactive)
    return apiSuccess(data)
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const { name, amount, frequency, nextDueDate, source } = body

    if (!name || !amount || !nextDueDate) {
      throw new Error('Missing required fields: name, amount, nextDueDate')
    }

    const bill = await createBill(user.id, {
      name,
      amount,
      frequency,
      nextDueDate,
      source,
    })
    return apiSuccess(bill, { message: 'Bill added successfully' })
  }

  throw new Error('Method not allowed')
})
