import {
  createBudget,
  getBudgetsWithSpending,
  updateBudget,
  deleteBudget,
  getBudgetById,
  getFavoritedCount,
  toggleFavorite,
  budgetExists,
  getBudgetMonths,
} from '~/server/db/queries/budgets.js'

export interface BudgetInput {
  category?: string
  amount?: number
  id?: number
  isFavorited?: boolean
}

export interface BudgetOutput {
  id: number
  category: string
  budgetAmount: number
  spentAmount: number
  remainingAmount: number
  percentageUsed: number
  isFavorited?: boolean
  month?: string
}

export interface BudgetsData {
  budgets: BudgetOutput[]
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function getMonthRange(month: string): { startDate: string; endDate: string } {
  const [year, monthNum] = month.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0)
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

export async function getBudgets(userId: number, month?: string): Promise<BudgetsData> {
  const targetMonth = month || getCurrentMonth()
  const { startDate, endDate } = getMonthRange(targetMonth)
  const budgets = await getBudgetsWithSpending(userId, startDate, endDate, targetMonth)

  return {
    budgets: budgets.map((b: any) => ({
      id: b.id,
      category: b.category,
      budgetAmount: Number(b.budget_amount),
      spentAmount: Number(b.spent_amount),
      remainingAmount: Number(b.remaining_amount),
      percentageUsed: Number(b.percentage_used),
      isFavorited: b.is_favorited || false,
      month: b.month || targetMonth,
    })),
  }
}

export async function createNewBudget(
  userId: number,
  category: string,
  amount: number,
  isFavorited: boolean = false,
  month?: string
): Promise<any> {
  const targetMonth = month || getCurrentMonth()

  const existingBudget = await budgetExists(userId, category, targetMonth)
  if (existingBudget) {
    throw new Error(`A budget for "${category}" already exists for ${targetMonth}`)
  }

  const budget = await createBudget(userId, category, amount, isFavorited, targetMonth)
  return budget
}

export async function updateExistingBudget(
  budgetId: number,
  userId: number,
  updates: BudgetInput,
  month?: string
): Promise<any> {
  const targetMonth = month || getCurrentMonth()

  if (updates.isFavorited !== undefined) {
    if (updates.isFavorited) {
      const currentFavoritedCount = await getFavoritedCount(userId, targetMonth)
      if (currentFavoritedCount >= 2) {
        throw new Error(
          'You can only favorite up to 2 budgets. Please unfavorite another budget first.'
        )
      }
    }

    const budget = await toggleFavorite(budgetId, userId, updates.isFavorited)
    if (!budget) {
      throw new Error('Budget not found or access denied')
    }
    return budget
  }

  const budget = await updateBudget(budgetId, userId, {
    amount: updates.amount,
    isActive: undefined,
    isFavorited: updates.isFavorited,
  })

  if (!budget) {
    throw new Error('Budget not found or access denied')
  }

  return budget
}

export async function removeBudget(budgetId: number, userId: number): Promise<void> {
  const budget = await deleteBudget(budgetId, userId)
  if (!budget) {
    throw new Error('Budget not found or access denied')
  }
}

export async function getAvailableMonths(userId: number): Promise<string[]> {
  const months = await getBudgetMonths(userId)
  return months.sort().reverse()
}
