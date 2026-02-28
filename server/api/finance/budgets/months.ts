import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/auth.js'
import { getBudgetMonths } from '~/server/db/queries/budgets.js'

export default defineEventHandler(async event => {
  const user = await requireAuth(event)

  const budgetMonths = await getBudgetMonths(user.id)

  return {
    statusCode: 200,
    months: budgetMonths.sort().reverse(),
  }
})
