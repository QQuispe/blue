<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import BaseButton from '~/components/BaseButton.vue'

interface Budget {
  id: number
  category: string
  budgetAmount: number
  spentAmount: number
  remainingAmount: number
  percentageUsed: number
  period: string
  isFavorited?: boolean
}

const budgets: Ref<Budget[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)

const fetchBudgets = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await fetch('/api/user/budgets', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch budgets')
    }
    
    const data = await response.json()
    budgets.value = data.budgets || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBudgets()
})

const refresh = () => {
  fetchBudgets()
}

defineExpose({ refresh })

// Calculate day of month for pace calculation
const getDayOfMonth = () => {
  return new Date().getDate()
}

const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

// Calculate projected spending for a budget
const getProjectedSpending = (budget: Budget): number => {
  const dayOfMonth = getDayOfMonth()
  if (dayOfMonth === 0 || budget.spentAmount === 0) return budget.spentAmount
  
  const dailyRate = budget.spentAmount / dayOfMonth
  return dailyRate * daysInMonth
}

const getProjectedPercentage = (budget: Budget): number => {
  const projected = getProjectedSpending(budget)
  if (budget.budgetAmount === 0) return 0
  return (projected / budget.budgetAmount) * 100
}

// Determine budget risk level
const getRiskLevel = (budget: Budget): 'high' | 'medium' | 'low' => {
  const projected = getProjectedPercentage(budget)
  if (projected >= 100) return 'high'
  if (projected >= 80) return 'medium'
  return 'low'
}

// Show only favorited budgets (max 2)
const topBudgets = computed(() => {
  return budgets.value
    .filter(b => b.isFavorited)
    .map(budget => ({
      ...budget,
      projectedPercentage: getProjectedPercentage(budget),
      riskLevel: getRiskLevel(budget)
    }))
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 }
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      if (riskDiff !== 0) return riskDiff
      return b.projectedPercentage - a.projectedPercentage
    })
    .slice(0, 2)
})

const totalBudgeted = computed(() => {
  return budgets.value.reduce((sum, b) => sum + b.budgetAmount, 0)
})

const totalSpent = computed(() => {
  return budgets.value.reduce((sum, b) => sum + b.spentAmount, 0)
})

const overallProgress = computed(() => {
  if (totalBudgeted.value === 0) return 0
  return (totalSpent.value / totalBudgeted.value) * 100
})

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const getProgressColorClass = (percentage: number): string => {
  if (percentage >= 100) return 'over-budget'
  if (percentage >= 80) return 'warning'
  return 'good'
}

const getRiskColorClass = (riskLevel: string): string => {
  if (riskLevel === 'high') return 'risk-high'
  if (riskLevel === 'medium') return 'risk-medium'
  return 'risk-low'
}

const getCategoryPath = (category: string): string => {
  const paths: Record<string, string> = {
    'Food': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 7h2v6h-2zm0 8h2v2h-2z',
    'Transportation': 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
    'Shopping': 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
    'Entertainment': 'M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3h12a3 3 0 003-3 3 3 0 00-3-3zm-6 5a2 2 0 100 4 2 2 0 000-4zm0 6c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z',
    'Housing': 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    'Utilities': 'M13 2.03v2.02c4.39.54 7.5 4.53 6.96 8.92-.46 3.55-3.46 6.46-6.96 6.92-4.39.54-8.03-2.93-8.03-7.32 0-4.39 3.64-7.36 8.03-7.91zM9 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6-8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
    'Healthcare': 'M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z',
    'Education': 'M5 3v4h-.48c-.66 0-1.21.42-1.42 1.01L2 10v9c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-9l-1.1-1c-.21-.59-.76-1.01-1.42-1.01H19V3H5zm13 9h-2V8h-2v4H8l4 4 4-4z',
    'Travel': 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
    'Groceries': 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
    'Dining': 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
    'Subscriptions': 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9V9h10v2zm-4 4H9V9h10v2z',
    'Savings': 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
    'Investments': 'M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z',
    'Insurance': 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    'Gifts': 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z',
    'Personal': 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    'Other': 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'
  }
  return paths[category] || 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'
}

const navigateToBudgets = () => {
  const router = useRouter()
  router.push('/dashboard/balance')
}
</script>

<template>
  <div class="budget-progress-card">
    <div class="card-header">
      <div class="header-left">
        <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <h3>Budget Progress</h3>
      </div>
    </div>

    <div class="separator"></div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="error" class="error-state">
      <span>{{ error }}</span>
    </div>

    <div v-else-if="budgets.length === 0" class="empty-state">
      <div class="empty-content">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <span class="empty-text">No budgets set</span>
        <BaseButton variant="secondary" size="sm" to="/dashboard/budgets" class="setup-btn">
          Set your first budget
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </BaseButton>
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <span>{{ error }}</span>
    </div>

    <div v-else-if="budgets.length === 0" class="empty-state">
      <div class="empty-content">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <span class="empty-text">No budgets set</span>
        <BaseButton variant="secondary" size="sm" to="/dashboard/budgets" class="setup-btn">
          Set your first budget
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </BaseButton>
      </div>
    </div>

    <div v-else class="card-content">
      <!-- Overall Progress -->
      <div class="overall-progress">
        <div class="overall-header">
          <span class="overall-label">Overall</span>
          <span class="overall-value">{{ overallProgress.toFixed(0) }}%</span>
        </div>
        <div class="overall-bar">
          <div 
            class="overall-bar-fill" 
            :class="getProgressColorClass(overallProgress)"
            :style="{ width: `${Math.min(overallProgress, 100)}%` }"
          ></div>
        </div>
        <div class="overall-stats">
          <span class="spent">{{ formatCurrency(totalSpent) }} spent</span>
          <span class="divider">/</span>
          <span class="budgeted">{{ formatCurrency(totalBudgeted) }} budgeted</span>
        </div>
      </div>

      <!-- No Favorites Message -->
      <div v-if="topBudgets.length === 0" class="no-favorites-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <span>No favorites selected. Star budgets in the full page.</span>
      </div>

      <!-- Budget List -->
      <div v-else class="budget-list">
        <div 
          v-for="budget in topBudgets" 
          :key="budget.id"
          class="budget-item"
          :class="{ 'at-risk': budget.riskLevel !== 'low' }"
        >
          <div class="budget-header">
            <div class="budget-category">
              <svg class="category-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="getCategoryPath(budget.category)"/>
              </svg>
              <span class="category-name">{{ budget.category }}</span>
              <span 
                v-if="budget.riskLevel !== 'low'" 
                class="risk-indicator"
                :class="getRiskColorClass(budget.riskLevel)"
              >
                {{ budget.riskLevel === 'high' ? 'Over pace' : 'On watch' }}
              </span>
            </div>
            <div class="budget-amounts">
              <span class="spent-amount">{{ formatCurrency(budget.spentAmount) }}</span>
              <span class="divider">/</span>
              <span class="budget-amount">{{ formatCurrency(budget.budgetAmount) }}</span>
            </div>
          </div>
          <div class="budget-bar">
            <div 
              class="budget-bar-fill" 
              :class="getProgressColorClass(budget.percentageUsed)"
              :style="{ width: `${Math.min(budget.percentageUsed, 100)}%` }"
            ></div>
          </div>
          <div class="budget-footer">
            <span class="percentage" :class="getProgressColorClass(budget.percentageUsed)">
              {{ budget.percentageUsed.toFixed(0) }}%
            </span>
            <span class="projection">
              Pace: 
              <span :class="getRiskColorClass(budget.riskLevel)">
                {{ budget.projectedPercentage.toFixed(0) }}%
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- View All Button -->
      <BaseButton 
        variant="secondary" 
        size="sm" 
        to="/dashboard/budgets"
        class="view-all-btn"
      >
        View all budgets
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.budget-progress-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

h3 {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

/* Overall Progress */
.overall-progress {
  background: var(--color-bg-secondary);
  padding: 0.75rem;
  border-radius: 8px;
}

.overall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.overall-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.overall-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.overall-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.overall-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.overall-bar-fill.good {
  background: var(--color-success);
}

.overall-bar-fill.warning {
  background: var(--color-warning);
}

.overall-bar-fill.over-budget {
  background: var(--color-error);
}

.overall-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.overall-stats .spent {
  color: var(--color-text-primary);
  font-weight: 500;
}

.overall-stats .divider {
  opacity: 0.5;
}

/* Budget List */
.budget-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.budget-item {
  background: var(--color-bg-secondary);
  padding: 0.625rem;
  border-radius: 6px;
  border-left: 2px solid transparent;
}

.budget-item.at-risk {
  border-left-color: var(--color-warning);
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

.budget-category {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.category-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.category-name {
  font-size: 0.75rem;
  color: var(--color-text-primary);
  font-weight: 500;
}

.risk-indicator {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.risk-indicator.risk-high {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error);
}

.risk-indicator.risk-medium {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-warning);
}

.budget-amounts {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
}

.spent-amount {
  color: var(--color-text-primary);
  font-weight: 500;
}

.divider {
  color: var(--color-text-muted);
  opacity: 0.5;
}

.budget-amount {
  color: var(--color-text-muted);
}

.budget-bar {
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.375rem;
}

.budget-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.budget-bar-fill.good {
  background: var(--color-success);
}

.budget-bar-fill.warning {
  background: var(--color-warning);
}

.budget-bar-fill.over-budget {
  background: var(--color-error);
}

.budget-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.percentage {
  font-size: 0.6875rem;
  font-weight: 500;
}

.percentage.good {
  color: var(--color-success);
}

.percentage.warning {
  color: var(--color-warning);
}

.percentage.over-budget {
  color: var(--color-error);
}

.projection {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.projection .risk-high {
  color: var(--color-error);
  font-weight: 500;
}

.projection .risk-medium {
  color: var(--color-warning);
  font-weight: 500;
}

.projection .risk-low {
  color: var(--color-success);
}

/* View All Button */
.view-all-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  width: auto;
}

/* Empty State */
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 0;
}

.empty-icon {
  color: var(--color-text-muted);
  opacity: 0.5;
}

.empty-text {
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.empty-hint {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  opacity: 0.7;
}

.setup-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  width: auto;
  margin-top: 0.25rem;
}

.no-favorites-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.no-favorites-message svg {
  flex-shrink: 0;
  color: var(--color-text-muted);
  opacity: 0.7;
}

/* States */
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.error-state {
  color: var(--color-error);
}
</style>