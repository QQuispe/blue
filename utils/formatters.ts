import { budgetCategories, categoryIcons, categoryColors } from '~/composables/useBudgetCategories'

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const formatAmount = (amount: number): string => {
  const formatted = Math.abs(amount).toFixed(2)
  return amount < 0 ? `-$${formatted}` : `+$${formatted}`
}

export const getProgressColorClass = (percentage: number): string => {
  if (percentage >= 100) return 'over-budget'
  if (percentage >= 80) return 'warning'
  return 'good'
}

export const getRiskColorClass = (riskLevel: string): string => {
  if (riskLevel === 'high') return 'risk-high'
  if (riskLevel === 'medium') return 'risk-medium'
  return 'risk-low'
}

export const getCategoryIcon = (category: string): string => {
  return categoryIcons[category] || 'mdi:circle-outline'
}

export const getCategoryColor = (category: string): string => {
  return categoryColors[category] || '#6b7280'
}
