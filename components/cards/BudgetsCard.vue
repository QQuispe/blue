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
              backgroundColor: getProgressColor(overallPercentage)
            }"
          ></div>
        </div>
        <div class="progress-stats">
          <span class="stat">${{ formatCurrency(totalSpent) }} / ${{ formatCurrency(totalBudget) }}</span>
          <span class="remaining" :class="{ 'over-budget': totalRemaining < 0 }">
            {{ totalRemaining >= 0 ? '' : '-' }}${{ formatCurrency(Math.abs(totalRemaining)) }} remaining
          </span>
        </div>
      </div>
      
      <!-- Individual Budgets -->
      <div class="budgets-list">
        <div 
          v-for="budget in budgets.slice(0, 3)" 
          :key="budget.id"
          class="budget-item"
        >
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
                  backgroundColor: getProgressColor(budget.percentageUsed)
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
}

/* Header Row - Standardized */
.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}

.header-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #3EB489;
  letter-spacing: -0.01em;
}

/* Minimal separator */
.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  margin: 0;
}

/* Loading & Error States */
.loading-state, .error-state, .no-budgets {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  text-align: center;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.06);
  border-top-color: #3EB489;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: #ef4444;
}

.no-budgets .empty-icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

.no-budgets p {
  color: rgba(255, 255, 255, 0.9);
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
  background-color: rgba(255, 255, 255, 0.06);
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
  color: rgba(255, 255, 255, 0.7);
}

.progress-stats .remaining {
  color: #3EB489;
  font-weight: 500;
}

.progress-stats .remaining.over-budget {
  color: #ef4444;
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
  background: #151515;
  border-radius: 6px;
}

.budget-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-category {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.9);
}

.budget-percentage {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.budget-progress {
  width: 100%;
}

.more-budgets {
  text-align: center;
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  padding: 0.25rem 0;
}
</style>
