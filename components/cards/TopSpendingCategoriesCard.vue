<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import Chart from 'chart.js/auto'

const categories: Ref<any[]> = ref([])
const totalSpending: Ref<number> = ref(0)
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)
const period: Ref<any> = ref(null)
const chartCanvas: Ref<any> = ref(null)
let chart = null

// Fetch spending data from API
const fetchSpending = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await fetch('/api/user/spending-by-category', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch spending data')
    }
    
    const data = await response.json()
    categories.value = data.categories
    totalSpending.value = data.totalSpending
    period.value = data.period
  } catch (err) {
    console.error('Error fetching spending:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
  } finally {
    isLoading.value = false
  }
}

// Create or update chart
const createChart = () => {
  if (!chartCanvas.value || categories.value.length === 0) return
  
  // Destroy existing chart
  if (chart) {
    chart.destroy()
  }
  
  // Prepare data - top 5 categories, rest as "Other"
  const topCategories = categories.value.slice(0, 5)
  const otherAmount = categories.value.slice(5).reduce((sum, cat) => sum + cat.amount, 0)
  
  const labels = topCategories.map(c => c.category)
  const data = topCategories.map(c => c.amount)
  
  if (otherAmount > 0) {
    labels.push('Other')
    data.push(otherAmount)
  }
  
  // Get computed CSS variable values for chart colors
  const computedStyle = getComputedStyle(document.documentElement)
  const colors = [
    computedStyle.getPropertyValue('--color-chart-1').trim() || '#3EB489',
    computedStyle.getPropertyValue('--color-chart-2').trim() || '#3b82f6',
    computedStyle.getPropertyValue('--color-chart-3').trim() || '#8b5cf6',
    computedStyle.getPropertyValue('--color-chart-4').trim() || '#f59e0b',
    computedStyle.getPropertyValue('--color-chart-5').trim() || '#ef4444',
    computedStyle.getPropertyValue('--color-chart-6').trim() || '#6b7280'
  ]
  const textPrimary = computedStyle.getPropertyValue('--color-text-primary').trim() || '#ffffff'
  
  chart = new Chart(chartCanvas.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textPrimary,
            font: {
              size: 10
            },
            boxWidth: 10,
            padding: 8
          }
        },
        tooltip: {
            callbacks: {
              label: (context: any) => {
                const value = context.raw
                const percentage = totalSpending.value > 0 
                  ? ((value / totalSpending.value) * 100).toFixed(1)
                  : 0
                return `$${Number(value.toFixed(2))} (${percentage}%)`
              }
            }
        }
      },
      cutout: '65%'
    }
  })

  // Add resize handler
  window.addEventListener('resize', () => {
    if (chart) {
      chart.resize()
    }
  })
}

// Watch for data changes and create chart
onMounted(async () => {
  await fetchSpending()
  createChart()
})

// Computed properties
const hasData = computed(() => categories.value.length > 0)
const topCategory = computed(() => categories.value[0] || null)

// Expose refresh method for parent component
const refresh = async () => {
  await fetchSpending()
  createChart()
}

defineExpose({ refresh })
</script>

<template>
  <div class="spending-categories-card">
    <!-- Header Row: Title left, Value right -->
    <div class="card-header-row">
      <h3 class="title">Top Spending</h3>
      <div v-if="!isLoading && !error && hasData" class="header-value">
        ${{ totalSpending.toFixed(2) }}
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
    
    <!-- No Data State -->
    <div v-else-if="!hasData" class="no-data">
      <div class="empty-icon">📈</div>
      <p>No spending data available</p>
    </div>
    
    <!-- Content -->
    <div v-else class="card-content">
      <!-- Chart -->
      <div class="chart-container">
        <canvas ref="chartCanvas"></canvas>
      </div>
      
      <!-- Top Category -->
      <div v-if="topCategory" class="top-category">
        <span class="top-label">Top: {{ topCategory.category }}</span>
        <span class="top-amount">${{ topCategory.amount.toFixed(2) }} ({{ topCategory.percentage }}%)</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spending-categories-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.card-content {
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
  color: var(--color-error);
  letter-spacing: -0.01em;
}

/* Minimal separator */
.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
  margin: 0;
}

/* Loading & Error States */
.loading-state, .error-state, .no-data {
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

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-success);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: var(--color-error);
}

.no-data .empty-icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

.no-data p {
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

.chart-container {
  flex: 0 0 auto;
  height: 110px;
  position: relative;
  width: 100%;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}

.top-category {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.625rem;
  background: var(--color-bg-card);
  border-radius: 6px;
  font-size: 0.8125rem;
}

.top-label {
  color: var(--color-text-primary);
}

.top-amount {
  color: var(--color-success);
  font-weight: 600;
}
</style>
