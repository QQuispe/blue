<script setup>
import { ref, onMounted, computed } from 'vue'
import Chart from 'chart.js/auto'

const categories = ref([])
const totalSpending = ref(0)
const isLoading = ref(true)
const error = ref(null)
const period = ref(null)
const chartCanvas = ref(null)
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
    error.value = err.message
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
  
  // Color palette
  const colors = [
    '#3EB489',
    '#3b82f6',
    '#8b5cf6',
    '#f59e0b',
    '#ef4444',
    '#6b7280'
  ]
  
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
             color: 'rgba(255, 255, 255, 0.9)',
            font: {
              size: 10
            },
            boxWidth: 10,
            padding: 8
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw
              const percentage = totalSpending.value > 0 
                ? ((value / totalSpending.value) * 100).toFixed(1)
                : 0
              return `$${value.toFixed(2)} (${percentage}%)`
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
  color: #ef4444;
  letter-spacing: -0.01em;
}

/* Minimal separator */
.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
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

.no-data .empty-icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

.no-data p {
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
  background: #151515;
  border-radius: 6px;
  font-size: 0.8125rem;
}

.top-label {
  color: rgba(255, 255, 255, 0.9);
}

.top-amount {
  color: #3EB489;
  font-weight: 600;
}
</style>
