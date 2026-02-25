import { budgetCategories, categoryIcons, categoryColors } from '~/composables/useBudgetCategories'

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

export const toISODateString = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return new Date().toISOString().split('T')[0]

  const date = new Date(dateValue)
  // Extract just the YYYY-MM-DD part to avoid timezone issues
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const toHTMLDateString = (dateValue: any): string => {
  // Handle null, undefined, or empty string
  if (!dateValue) {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Extract just the date part if there's a timestamp
  const dateOnly = String(dateValue).split('T')[0]

  // If it's already a YYYY-MM-DD string, return it directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return dateOnly
  }

  // Try to parse the date
  let date: Date
  try {
    date = new Date(dateOnly + 'T12:00:00')
    if (isNaN(date.getTime())) {
      const today = new Date()
      return today.toISOString().split('T')[0]
    }
  } catch {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Format as YYYY-MM-DD using local time
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
