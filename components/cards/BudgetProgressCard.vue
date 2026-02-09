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
    'Food': 'mdi:food',
    'Transportation': 'mdi:car',
    'Shopping': 'mdi:shopping',
    'Entertainment': 'mdi:movie',
    'Housing': 'mdi:home',
    'Utilities': 'mdi:lightning-bolt',
    'Healthcare': 'mdi:hospital-box',
    'Education': 'mdi:school',
    'Travel': 'mdi:airplane',
    'Groceries': 'mdi:cart',
    'Dining': 'mdi:food-variant',
    'Subscriptions': 'mdi:repeat',
    'Savings': 'mdi:piggy-bank',
    'Investments': 'mdi:trending-up',
    'Insurance': 'mdi:shield-check',
    'Gifts': 'mdi:gift',
    'Personal': 'mdi:account',
    'Other': 'mdi:dots-horizontal'
  }
  return paths[category] || 'mdi:circle-outline'
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
        <Icon name="mdi:chart-pie" size="20" />
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
        <Icon name="mdi:chart-pie" size="32" class="empty-icon" />
        <span class="empty-text">No budgets set</span>
        <BaseButton variant="secondary" size="sm" to="/dashboard/budgets" class="setup-btn">
          Set your first budget
          <Icon name="mdi:arrow-right" size="14" />
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
        <Icon name="mdi:star-outline" size="14" />
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
              <Icon :name="getCategoryPath(budget.category)" size="16" class="category-icon" />
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
        <Icon name="mdi:arrow-right" size="14" />
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