export const categoryColors: Record<string, string> = {
  'Bank Fees': '#ef4444',
  'Entertainment': '#8b5cf6',
  'Food & Drink': '#f59e0b',
  'General Merchandise': '#3b82f6',
  'General Services': '#6b7280',
  'Government & Non Profit': '#f97316',
  'Home Improvement': '#14b8a6',
  'Income': '#10b981',
  'Loan Disbursements': '#ec4899',
  'Loan Payments': '#f43f5e',
  'Medical': '#06b6d4',
  'Other': '#6b7280',
  'Personal Care': '#a855f7',
  'Rent & Utilities': '#84cc16',
  'Transfer In': '#10b981',
  'Transfer Out': '#ef4444',
  'Transportation': '#6366f1',
  'Travel': '#0ea5e9',
}

export const getCategoryColor = (category: string | null): string => {
  if (!category) return '#6b7280'
  return categoryColors[category] || '#6b7280'
}
