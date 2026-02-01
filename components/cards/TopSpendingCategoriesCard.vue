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
    '#18ffc1',
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
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: 'rgba(255, 255, 255, 0.8)',
            font: {
              size: 11
            },
            boxWidth: 12,
            padding: 10
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
      cutout: '60%'
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
</script>

<template>
  <div class="spending-categories-card">
    <div class="card-header">
      <h3 class="title">Top Spending</h3>
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
    
    <div v-else-if="!hasData" class="no-data">
      No spending data available
    </div>
    
    <div v-else class="card-content">
      <!-- Total Spending -->
      <div class="total-spending">
        <span class="total-label">Total Spent</span>
        <span class="total-amount">${{ totalSpending.toFixed(2) }}</span>
      </div>
      
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
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  color: white;
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

.period {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.loading-state, .error-state, .no-data {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  padding: 2rem 0;
}

.error-state {
  color: #ef4444;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.total-spending {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.total-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.total-amount {
  font-size: 1.25rem;
  font-weight: 600;
  color: #ef4444;
}

.chart-container {
  flex: 1;
  min-height: 150px;
  position: relative;
}

.top-category {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.875rem;
}

.top-label {
  color: white;
}

.top-amount {
  color: #18ffc1;
  font-weight: 500;
}
</style>
