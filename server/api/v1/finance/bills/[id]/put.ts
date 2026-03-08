import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getRouterParam, readBody } from 'h3'
import { updateBill, verifyBillOwnership } from '~/server/services/finance/bills.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const billId = getRouterParam(event, 'id')

  if (!billId) {
    throw new Error('Bill ID is required')
  }

  const parsedBillId = parseInt(billId)
  if (isNaN(parsedBillId)) {
    throw new Error('Invalid bill ID')
  }

  // Verify bill belongs to user
  const isOwner = await verifyBillOwnership(parsedBillId, user.id)
  if (!isOwner) {
    throw new Error('Bill not found')
  }

  const body = await readBody(event)
  const { amount, nextDueDate, isActive } = body

  const bill = await updateBill(parsedBillId, user.id, { amount, nextDueDate, isActive })
  return apiSuccess(bill, { message: 'Bill updated successfully' })
})
