<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'

const budgets: Ref<any[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)
const period: Ref<any> = ref(null)

// Fetch budgets data from API
const fetchBudgets = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await fetch('/api/finance/budgets', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch budgets')
    }

    const data = await response.json()
    budgets.value = data.budgets
    period.value = data.period
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBudgets()
})

// Expose refresh method for parent component
const refresh = () => {
  fetchBudgets()
}

defineExpose({ refresh })

// Computed properties
const hasBudgets = computed(() => budgets.value.length > 0)

const totalBudget = computed(() => {
  return budgets.value.reduce((sum, b) => sum + b.budgetAmount, 0)
})

const totalSpent = computed(() => {
  return budgets.value.reduce((sum, b) => sum + b.spentAmount, 0)
})

const totalRemaining = computed(() => {
  return totalBudget.value - totalSpent.value
})

const overallPercentage = computed(() => {
  if (totalBudget.value === 0) return 0
  return parseFloat(((totalSpent.value / totalBudget.value) * 100).toFixed(1))
})

// Get color based on percentage used
const getProgressColor = (percentage: number): string => {
  if (percentage < 50) return 'var(--color-success)'
  if (percentage < 75) return 'var(--color-warning)'
  if (percentage < 90) return 'var(--color-orange)'
  return 'var(--color-error)'
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>

<template>
  <div class="budgets-card">
    <!-- Header Row: Title left, Value right -->
    <div class="card-header-row">
      <h3 class="title">Budgets</h3>
      <div v-if="!isLoading && !error && hasBudgets" class="header-value">
        {{ overallPercentage }}%
      </div>
    </div>

    <!-- Minimal separator -->
    <div class="separator"></div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>

    <!-- No Budgets State -->
    <div v-else-if="!hasBudgets" class="no-budgets">
      <div class="empty-icon">🎯</div>
      <p>No budgets set</p>
    </div>

    <!-- Content -->
    <div v-else class="card-content">
      <!-- Overall Progress -->
      <div class="overall-progress">
        <div class="progress-bar-bg">
          <div
            class="progress-bar-fill"
            :style="{
              width: `${Math.min(overallPercentage, 100)}%`,
              backgroundColor: getProgressColor(overallPercentage),
            }"
          ></div>
        </div>
        <div class="progress-stats">
          <span class="stat"
            >{{ formatCurrency(totalSpent.value) }} / {{ formatCurrency(totalBudget.value) }}</span
          >
          <span class="remaining" :class="{ 'over-budget': totalRemaining < 0 }">
            {{ totalRemaining >= 0 ? '' : '-'
            }}{{ formatCurrency(Math.abs(totalRemaining)) }} remaining
          </span>
        </div>
      </div>

      <!-- Individual Budgets -->
      <div class="budgets-list">
        <div v-for="budget in budgets.slice(0, 3)" :key="budget.id" class="budget-item">
          <div class="budget-info">
            <span class="budget-category">{{ budget.category }}</span>
            <span class="budget-percentage">{{ budget.percentageUsed }}%</span>
          </div>
          <div class="budget-progress">
            <div class="progress-bar-bg small">
              <div
                class="progress-bar-fill"
                :style="{
                  width: `${Math.min(budget.percentageUsed, 100)}%`,
                  backgroundColor: getProgressColor(budget.percentageUsed),
                }"
              ></div>
            </div>
          </div>
        </div>

        <div v-if="budgets.length > 3" class="more-budgets">
          +{{ budgets.length - 3 }} more budgets
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.budgets-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.budgets-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Header Row - Standardized */
.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}

.header-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-success);
  letter-spacing: -0.01em;
}

/* Minimal separator */
.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
  margin: 0;
}

/* Loading & Error States */
.loading-state,
.error-state,
.no-budgets {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-align: center;
}

.error-state {
  color: var(--color-error);
}

.no-budgets .empty-icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

.no-budgets p {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  margin: 0;
}

/* Content */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

/* Overall Progress */
.overall-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background-color: var(--color-bg-subtle);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-bg.small {
  height: 3px;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.progress-stats .stat {
  color: var(--color-text-secondary);
}

.progress-stats .remaining {
  color: var(--color-success);
  font-weight: 500;
}

.progress-stats .remaining.over-budget {
  color: var(--color-error);
}

/* Budgets List */
.budgets-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.budget-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.625rem;
  background: var(--color-bg-elevated);
  border-radius: 6px;
}

.budget-item:hover {
  background: var(--color-bg-card-hover);
}

.budget-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-category {
  font-size: 0.8125rem;
  color: var(--color-text-primary);
}

.budget-percentage {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.budget-progress {
  width: 100%;
}

.more-budgets {
  text-align: center;
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  padding: 0.25rem 0;
}
</style>
