<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, type Ref } from 'vue'
import Chart from 'chart.js/auto'

const currentData: Ref<any> = ref(null)
const historyData: Ref<any[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)
const selectedTimeframe: Ref<string> = ref('12m')
const chartCanvas = ref(null)
let chart: any = null

const timeframes = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'ALL' }
]

// Fetch net worth data from API
const fetchNetWorth = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await fetch(`/api/user/net-worth?timeframe=${selectedTimeframe.value}`, {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch net worth')
    }
    
    const data = await response.json()
    
    currentData.value = data.current
    historyData.value = data.history || []
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchNetWorth()
})

// Cleanup chart on unmount
onUnmounted(() => {
  if (chart) {
    chart.destroy()
    chart = null
    }
  })
 
// Expose refresh method for parent component
const refresh = () => {
  fetchNetWorth()
}

defineExpose({ refresh })

// Computed properties
const formattedNetWorth = computed(() => {
  if (!currentData.value) return '0.00'
  return currentData.value.netWorth.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})

const percentageChange = computed(() => {
  if (!currentData.value) return 0
  return currentData.value.percentageChange || 0
})

const percentageChangeClass = computed(() => {
  if (percentageChange.value > 0) return 'positive'
  if (percentageChange.value < 0) return 'negative'
  return 'neutral'
})

const changeIcon = computed(() => {
  if (percentageChange.value > 0) return '↑'
  if (percentageChange.value < 0) return '↓'
  return '→'
})

// Change timeframe
const changeTimeframe = (timeframe) => {
  selectedTimeframe.value = timeframe
}

// Initialize Chart.js
const initChart = () => {
  if (!chartCanvas.value || !historyData.value.length) return
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return
  
  // Destroy existing chart
  if (chart) {
    chart.destroy()
  }
  
  const labels = historyData.value.map(d => {
    const date = new Date(d.date)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  })
  
  const values = historyData.value.map(d => d.netWorth)
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Net Worth',
        data: values,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#10b981'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f9fafb',
          bodyColor: '#f9fafb',
          borderColor: '#374151',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context) => `$${context.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#6b7280',
            maxTicksLimit: 6,
            font: {
              size: 10
            }
          },
          border: {
            display: false
          }
        },
        y: {
          grid: {
            color: 'rgba(107, 114, 128, 0.1)'
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 10
            },
            callback: (value) => `$${(value as number / 1000).toFixed(0)}k`
          },
          border: {
            display: false
          }
        }
      }
    }
  })
}

// Watch for data changes and update chart
watch(historyData, () => {
  nextTick(() => {
    initChart()
  })
}, { deep: true })

// Watch for timeframe changes
watch(selectedTimeframe, () => {
  fetchNetWorth()
})
</script>

<template>
  <div class="net-worth-card">
    <!-- Header: Title (left) | Timeframe (center) | Value (right) -->
    <div class="header-row">
      <!-- Left: Title -->
      <div class="header-left">
        <div class="title-section">
          <Icon name="mdi:chart-line" size="18" />
          <h3 class="title">Net Worth</h3>
        </div>
      </div>
      
      <!-- Center: Timeframe Selector -->
      <div class="timeframe-selector">
        <button 
          v-for="tf in timeframes" 
          :key="tf.value"
          class="timeframe-btn"
          :class="{ active: selectedTimeframe === tf.value }"
          @click="changeTimeframe(tf.value)"
        >
          {{ tf.label }}
        </button>
      </div>
      
      <!-- Right: Value + Percentage -->
      <div class="header-right">
        <span class="value">${{ formattedNetWorth }}</span>
        <span 
          v-if="percentageChange !== 0" 
          class="percentage" 
          :class="percentageChangeClass"
        >
          {{ changeIcon }} {{ Math.abs(percentageChange) }}%
        </span>
      </div>
    </div>
    
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
    <div v-else-if="historyData.length === 0" class="no-data">
      <div class="empty-icon">📈</div>
      <p>No historical data available</p>
      <span class="empty-hint">Connect accounts to start tracking your net worth</span>
    </div>
    
    <!-- Chart -->
    <div v-else class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>

<style scoped>
.net-worth-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  overflow: hidden;
  flex: 1;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Header row: Title (left) | Timeframe (center) | Value (right) */
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
  justify-content: flex-end;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.title {
  color: var(--color-text-primary);
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1;
}

.value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-success);
  letter-spacing: -0.01em;
  line-height: 1;
}

.percentage {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.1875rem 0.4375rem;
  border-radius: 3px;
  display: flex;
  align-items: center;
  gap: 0.125rem;
  line-height: 1;
}

.percentage.positive {
  color: var(--color-success);
  background: var(--color-success-bg-subtle);
}

.percentage.negative {
  color: var(--color-error);
  background: var(--color-error-bg-subtle);
}

.percentage.neutral {
  color: var(--color-text-secondary);
  background: var(--color-bg-subtle);
}

/* Timeframe Selector - inline with header */
.timeframe-selector {
  display: flex;
  gap: 0.125rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.timeframe-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 0.25rem 0.4375rem;
  color: var(--color-text-secondary);
  font-size: 0.625rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1;
}

.timeframe-btn:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

.timeframe-btn.active {
  background: var(--color-success-bg-subtle);
  border-color: var(--color-success-border);
  color: var(--color-success);
}

/* Loading & Error States - adjusted for taller chart */
.loading-state, .error-state, .no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-align: center;
  flex: 1;
  min-height: 180px;
}

.error-state {
  color: var(--color-error);
}

.no-data .empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.no-data p {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  margin: 0;
}

.empty-hint {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

/* Chart Container - flex to fill available space */
.chart-container {
  flex: 1;
  min-height: 120px;
  max-height: 300px;
  position: relative;
  width: 100%;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
