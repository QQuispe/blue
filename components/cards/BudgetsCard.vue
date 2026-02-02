<script setup>
import { ref, onMounted, computed } from 'vue'

const budgets = ref([])
const isLoading = ref(true)
const error = ref(null)
const period = ref(null)

// Fetch budgets data from API
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
    budgets.value = data.budgets
    period.value = data.period
  } catch (err) {
    console.error('Error fetching budgets:', err)
    error.value = err.message
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
  return (totalSpent.value / totalBudget.value * 100).toFixed(1)
})

// Get color based on percentage used
const getProgressColor = (percentage) => {
  if (percentage < 50) return '#3EB489' // Green
  if (percentage < 75) return '#f59e0b' // Yellow
  if (percentage < 90) return '#f97316' // Orange
  return '#ef4444' // Red
}

const formatCurrency = (amount) => {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
</script>

<template>
  <div class="budgets-card">
    <div class="budgets-header">
      <h3 class="title">Budgets</h3>
      <span v-if="period" class="period">
        {{ new Date(period.startDate).toLocaleDateString('en-US', { month: 'short' }) }}
      </span>
    </div>
    
    <div v-if="isLoading" class="loading-state">
      Loading...
    </div>
    
    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>
    
    <div v-else-if="!hasBudgets" class="no-budgets">
      No budgets set
    </div>
    
    <div v-else class="budgets-content">
      <!-- Summary -->
      <div class="budget-summary">
        <div class="summary-item">
          <span class="summary-label">Total Budget</span>
          <span class="summary-value">${{ formatCurrency(totalBudget) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Spent</span>
          <span class="summary-value spent">${{ formatCurrency(totalSpent) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Remaining</span>
          <span class="summary-value" :class="{ 'over-budget': totalRemaining < 0 }">
            ${{ formatCurrency(totalRemaining) }}
          </span>
        </div>
      </div>
      
      <!-- Overall Progress -->
      <div class="overall-progress">
        <div class="progress-bar-bg">
          <div 
            class="progress-bar-fill"
            :style="{ 
              width: `${Math.min(overallPercentage, 100)}%`,
              backgroundColor: getProgressColor(overallPercentage)
            }"
          ></div>
        </div>
        <span class="progress-text">{{ overallPercentage }}% used</span>
      </div>
      
      <!-- Individual Budgets -->
      <div class="budgets-list">
        <div 
          v-for="budget in budgets" 
          :key="budget.id"
          class="budget-item"
        >
          <div class="budget-info">
            <span class="budget-category">{{ budget.category }}</span>
            <span class="budget-amounts">
              ${{ formatCurrency(budget.spentAmount) }} / ${{ formatCurrency(budget.budgetAmount) }}
            </span>
          </div>
          <div class="budget-progress">
            <div class="progress-bar-bg small">
              <div 
                class="progress-bar-fill"
                :style="{ 
                  width: `${Math.min(budget.percentageUsed, 100)}%`,
                  backgroundColor: getProgressColor(budget.percentageUsed)
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.budgets-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.budgets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

.period {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.loading-state, .error-state, .no-budgets {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  padding: 1rem 0;
}

.error-state {
  color: #ef4444;
}

.budgets-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.budget-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.summary-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #3EB489;
}

.summary-value.spent {
  color: #ef4444;
}

.summary-value.over-budget {
  color: #ef4444;
}

.overall-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-bg.small {
  height: 4px;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
}

.budgets-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
}

.budget-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.budget-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-category {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
}

.budget-amounts {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}
</style>
