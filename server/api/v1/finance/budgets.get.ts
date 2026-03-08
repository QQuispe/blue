import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getQuery, readBody } from 'h3'
import {
  getBudgets,
  createNewBudget,
  updateExistingBudget,
  removeBudget,
} from '~/server/services/finance/budgets.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const method = event.node.req.method
  const query = getQuery(event)
  const month = query.month as string | undefined

  if (method === 'GET') {
    const data = await getBudgets(user.id, month)
    return apiSuccess(data)
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const { category, amount, isFavorited = false } = body

    if (!category || !amount) {
      throw new Error('Category and amount are required')
    }

    const budget = await createNewBudget(user.id, category, amount, isFavorited, month)
    return apiSuccess(budget, { message: 'Budget created successfully' })
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    const { id, isFavorited } = body

    if (!id) {
      throw new Error('Budget ID is required')
    }

    const budget = await updateExistingBudget(id, user.id, body, month)
    return apiSuccess(budget, {
      message:
        isFavorited !== undefined
          ? isFavorited
            ? 'Budget favorited'
            : 'Budget unfavorited'
          : 'Budget updated successfully',
    })
  }

  if (method === 'DELETE') {
    const body = await readBody(event)
    const { id } = body

    if (!id) {
      throw new Error('Budget ID is required')
    }

    await removeBudget(id, user.id)
    return apiSuccess({ message: 'Budget deleted successfully' })
  }

  throw new Error('Method not allowed')
})
