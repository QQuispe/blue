<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/BaseButton.vue'
import { formatCurrency, getProgressColorClass } from '~/utils/formatters'
import BudgetProgressBar from '~/components/BudgetProgressBar.vue'
import { useBudgetProgress } from '~/composables/useBudgetProgress'

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

const { getProjectedPercentage, getRiskLevel } = useBudgetProgress()

const {
  data: response,
  pending,
  error,
  refresh,
} = useFetch('/api/finance/budgets', {
  credentials: 'include',
  immediate: false,
})

const budgets = computed(() => response.value?.budgets || [])
const isLoading = computed(() => pending.value)
const fetchError = computed(() => error.value)

const refreshBudgets = () => refresh()

defineExpose({ refresh: refreshBudgets })

const topBudgets = computed(() => {
  return budgets.value
    .filter(b => b.isFavorited)
    .map(budget => ({
      ...budget,
      projectedPercentage: getProjectedPercentage(budget),
      riskLevel: getRiskLevel(budget),
    }))
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 }
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      if (riskDiff !== 0) return riskDiff
      return b.projectedPercentage - a.projectedPercentage
    })
    .slice(0, 2)
})

const totalBudgeted = computed(() => budgets.value.reduce((sum, b) => sum + b.budgetAmount, 0))
const totalSpent = computed(() => budgets.value.reduce((sum, b) => sum + b.spentAmount, 0))
const overallProgress = computed(() => {
  if (totalBudgeted.value === 0) return 0
  return (totalSpent.value / totalBudgeted.value) * 100
})
</script>

<template>
  <div class="budget-progress-card">
    <div class="card-header-row">
      <div class="header-left">
        <Icon name="mdi:chart-pie" size="20" />
        <h3>Budget Progress</h3>
      </div>
      <BaseButton
        v-if="!isLoading && !error && budgets.length > 0"
        variant="secondary"
        size="sm"
        to="/finance/budgets"
        class="view-all-btn"
      >
        View all
        <Icon name="mdi:arrow-right" size="14" />
      </BaseButton>
    </div>

    <div class="separator"></div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="error" class="error-state">
      <span>{{ error.message || 'Failed to load budgets' }}</span>
    </div>

    <div v-else-if="budgets.length === 0" class="empty-state">
      <div class="empty-content">
        <Icon name="mdi:chart-pie" size="32" class="empty-icon" />
        <span class="empty-text">No budgets set</span>
        <BaseButton variant="secondary" size="sm" to="/finance/budgets" class="setup-btn">
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

      <!-- Budget List -->
      <div v-if="topBudgets.length === 0" class="no-favorites-message">
        <Icon name="mdi:star-outline" size="14" />
        <span>No favorites selected. Star budgets in the full page.</span>
      </div>

      <div v-else class="budget-list">
        <BudgetProgressBar
          v-for="budget in topBudgets"
          :key="budget.id"
          :budget="budget"
          :class="{ 'at-risk': budget.riskLevel !== 'low' }"
        />
      </div>
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

.card-header-row {
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

.header-left svg {
  opacity: 0.7;
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
  background: var(--color-bg-elevated);
  padding: 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.overall-progress:hover {
  transform: translateY(-2px);
}

.overall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.overall-label {
  font-size: 0.75rem;
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
  gap: 0.75rem;
}

/* View All Button */
.view-all-btn {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
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
  background: var(--color-bg-elevated);
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
