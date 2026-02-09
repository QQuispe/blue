interface Budget {
  budgetAmount: number
  spentAmount: number
}

export function useBudgetProgress() {
  const getDayOfMonth = () => new Date().getDate()
  const daysInMonth = () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

  const getProjectedSpending = (budget: Budget): number => {
    const dayOfMonth = getDayOfMonth()
    if (dayOfMonth === 0 || budget.spentAmount === 0) return budget.spentAmount
    return (budget.spentAmount / dayOfMonth) * daysInMonth()
  }

  const getProjectedPercentage = (budget: Budget): number => {
    const projected = getProjectedSpending(budget)
    if (budget.budgetAmount === 0) return 0
    return (projected / budget.budgetAmount) * 100
  }

  const getRiskLevel = (budget: Budget): 'high' | 'medium' | 'low' => {
    const projected = getProjectedPercentage(budget)
    if (projected >= 100) return 'high'
    if (projected >= 80) return 'medium'
    return 'low'
  }

  return { getProjectedSpending, getProjectedPercentage, getRiskLevel }
}
