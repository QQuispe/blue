<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue'
import Chart from 'chart.js/auto'
import { useCashFlowChart } from '~/composables/useCashFlowChart'

interface CashFlowData {
  months: string[]
  income: number[]
  expenses: number[]
  totals: {
    income: number
    expenses: number
    saved: number
    net: number
  }
}

const data: Ref<CashFlowData | null> = ref(null)
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)
const chartCanvas: Ref<any> = ref(null)
let chart: Chart | null = null

const fetchData = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await fetch('/api/user/cash-flow', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch cash flow data')
    }
    
    data.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

const { createChartData, createChartOptions } = useCashFlowChart()

const createChart = () => {
  if (!chartCanvas.value || !data.value) return
  
  if (chart) {
    chart.destroy()
  }
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  const chartData = createChartData({
    months: data.value.months,
    income: data.value.income,
    expenses: data.value.expenses
  })

  const chartOptions = createChartOptions(data.value.totals.income)
  
  chart = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: chartOptions
  })
}

onMounted(async () => {
  await fetchData()
  createChart()
})

onUnmounted(() => {
  if (chart) {
    chart.destroy()
    chart = null
  }
})

const formatCurrency = (value: number) => {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

const netStatus = computed(() => {
  if (!data.value) return 'neutral'
  return data.value.totals.net >= 0 ? 'positive' : 'negative'
})

const refresh = async () => {
  await fetchData()
  createChart()
}

defineExpose({ refresh })
</script>

<template>
  <div class="cash-flow-card">
    <div class="card-header-row">
      <h3 class="title">Cash Flow</h3>
      <div v-if="!isLoading && data" class="header-value" :class="netStatus">
        {{ data.totals.net >= 0 ? '+' : '' }}{{ formatCurrency(data.totals.net) }}
      </div>
    </div>
    
    <div class="separator"></div>
    
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading...</span>
    </div>
    
    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>
    
    <div v-else-if="!data || data.months.length === 0" class="no-data">
      <div class="empty-icon">📊</div>
      <p>No cash flow data available</p>
    </div>
    
    <div v-else class="card-content">
      <div class="summary-row">
        <div class="summary-item">
          <span class="summary-label">Income</span>
          <span class="summary-value positive">{{ formatCurrency(data.totals.income) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Spent</span>
          <span class="summary-value negative">{{ formatCurrency(data.totals.expenses) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Saved</span>
          <span class="summary-value" :class="data.totals.saved >= 0 ? 'positive' : 'negative'">
            {{ formatCurrency(data.totals.saved) }}
          </span>
        </div>
      </div>
      
      <div class="chart-container">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cash-flow-card {
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
  letter-spacing: -0.01em;
}

.header-value.positive {
  color: var(--color-success);
}

.header-value.negative {
  color: var(--color-error);
}

.header-value.neutral {
  color: var(--color-text-secondary);
}

.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
  margin: 0;
}

.loading-state, .error-state, .no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-align: center;
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

.summary-row {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  color: var(--color-text-muted);
  font-size: 0.6875rem;
  letter-spacing: 0.05em;
}

.summary-value {
  font-size: 0.9375rem;
  font-weight: 600;
}

.summary-value.positive {
  color: var(--color-success);
}

.summary-value.negative {
  color: var(--color-error);
}

.chart-container {
  flex: 0 0 auto;
  height: 140px;
  position: relative;
  width: 100%;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
