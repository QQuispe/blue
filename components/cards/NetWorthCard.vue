<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import Chart from 'chart.js/auto'

const currentData = ref(null)
const historyData = ref([])
const isLoading = ref(true)
const error = ref(null)
const selectedTimeframe = ref('12m')
const hasSyntheticData = ref(false)
const chartCanvas = ref(null)
let chart = null

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
    
    console.log(`[NetWorthCard] Fetching data for timeframe: ${selectedTimeframe.value}`)
    
    const response = await fetch(`/api/user/net-worth?timeframe=${selectedTimeframe.value}`, {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch net worth')
    }
    
    const data = await response.json()
    console.log(`[NetWorthCard] Received ${data.history?.length || 0} data points, synthetic: ${data.hasSyntheticData}`)
    
    currentData.value = data.current
    historyData.value = data.history || []
    hasSyntheticData.value = data.hasSyntheticData || false
  } catch (err) {
    console.error('Error fetching net worth:', err)
    error.value = err.message
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

// Watch for timeframe changes
watch(selectedTimeframe, () => {
  // Clear chart immediately to prevent visual flash
  if (chart) {
    chart.destroy()
    chart = null
  }
  historyData.value = []
  fetchNetWorth()
})

// Watch for data changes and create/update chart
watch([historyData, isLoading], async () => {
  if (!isLoading.value && historyData.value.length > 0) {
    await nextTick() // Wait for DOM to render the canvas
    createChart()
  }
})

// Create or update chart
const createChart = () => {
  if (!chartCanvas.value) {
    console.log('[NetWorthCard] Canvas not ready yet')
    return
  }
  
  if (historyData.value.length === 0) {
    console.log('[NetWorthCard] No history data to display')
    return
  }
  
  // Destroy existing chart
  if (chart) {
    chart.destroy()
    chart = null
  }
  
  const labels = historyData.value.map(d => {
    const date = new Date(d.date)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  })
  
  const data = historyData.value.map(d => d.netWorth)
  
  // Create gradient for fill
  const chartHeight = chartCanvas.value?.offsetHeight || 200
  const ctx = chartCanvas.value.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight)
  gradient.addColorStop(0, 'rgba(62, 180, 137, 0.3)')
  gradient.addColorStop(1, 'rgba(62, 180, 137, 0.0)')
  
  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#3EB489',
        backgroundColor: gradient,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#3EB489',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 5,
          right: 5,
          bottom: 5,
          left: 5
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: 'rgba(255, 255, 255, 0.7)',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex
              const date = new Date(historyData.value[index].date)
              return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            },
            label: (context) => {
              const value = context.raw
              return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: {
              size: 10
            },
            autoSkip: true,
            autoSkipPadding: 10,
            maxRotation: 0,
            minRotation: 0
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
            drawBorder: false
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: {
              size: 10
            },
            maxTicksLimit: 6,
            callback: (value) => {
              if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M'
              if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'k'
              return '$' + value
            }
          }
        }
      }
    }
  })
}

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
</script>

<template>
  <div class="net-worth-card">
    <!-- Header: Title (left) | Timeframe (center) | Value (right) -->
    <div class="header-row">
      <!-- Left: Title + DEV badge -->
      <div class="header-left">
        <div class="title-section">
          <h3 class="title">Net Worth</h3>
          <span v-if="hasSyntheticData" class="dev-badge">DEV</span>
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
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1;
}

/* DEV badge inline with title */
.dev-badge {
  font-size: 0.5rem;
  font-weight: 700;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1;
}

.value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #3EB489;
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
  color: #3EB489;
  background: rgba(62, 180, 137, 0.12);
}

.percentage.negative {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

.percentage.neutral {
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.08);
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  padding: 0.25rem 0.4375rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.625rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1;
}

.timeframe-btn:hover {
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.8);
}

.timeframe-btn.active {
  background: rgba(62, 180, 137, 0.15);
  border-color: rgba(62, 180, 137, 0.35);
  color: #3EB489;
}

/* Loading & Error States - adjusted for taller chart */
.loading-state, .error-state, .no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  text-align: center;
  flex: 1;
  min-height: 180px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
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
  font-size: 2rem;
  opacity: 0.5;
}

.no-data p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  margin: 0;
}

.empty-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
}

/* Chart Container - maximized height ~210px */
.chart-container {
  flex: 1;
  min-height: 200px;
  max-height: 210px;
  position: relative;
  width: 100%;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
