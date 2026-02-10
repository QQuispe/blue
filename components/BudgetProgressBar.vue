<script setup lang="ts">
import { formatCurrency, getProgressColorClass, getRiskColorClass, getCategoryIcon } from '~/utils/formatters'

interface Budget {
  id: number
  category: string
  budgetAmount: number
  spentAmount: number
  percentageUsed: number
  projectedPercentage?: number
  riskLevel?: 'high' | 'medium' | 'low'
}

const props = defineProps<{
  budget: Budget
  compact?: boolean
}>()
</script>

<template>
  <div class="budget-progress-bar" :class="{ compact: compact }">
    <div class="budget-header">
      <div class="budget-category">
        <Icon :name="getCategoryIcon(budget.category)" size="16" class="category-icon" />
        <span class="category-name">{{ budget.category }}</span>
        <span 
          v-if="budget.riskLevel && budget.riskLevel !== 'low'" 
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
      <span v-if="budget.projectedPercentage !== undefined" class="projection">
        Pace: 
        <span :class="getRiskColorClass(budget.riskLevel || 'low')">
          {{ budget.projectedPercentage.toFixed(0) }}%
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.budget-progress-bar {
  background: var(--color-bg-elevated);
  padding: 0.625rem;
  border-radius: 6px;
}

.budget-progress-bar.compact {
  padding: 0.5rem;
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
</style>
