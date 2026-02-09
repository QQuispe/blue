<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'

interface OverviewMetric {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

interface OverviewData {
  totalBalance: OverviewMetric;
  monthlyIncome: OverviewMetric;
  monthlyExpenses: OverviewMetric;
  totalSavings: OverviewMetric;
  currency: string;
  currentMonth: string;
  previousMonth: string;
}

const isLoading: Ref<boolean> = ref(false)
const error: Ref<string | null> = ref(null)
const overviewData: Ref<OverviewData | null> = ref(null)

const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(value))
}

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

const getChangeClass = (change: number): string => {
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return 'neutral'
}

const getChangeIcon = (change: number): string => {
  if (change > 0) return 'mdi:arrow-up'
  if (change < 0) return 'mdi:arrow-down'
  return 'mdi:minus'
}

const metrics = computed(() => {
  if (!overviewData.value) return []
  
  return [
    {
      id: 'totalBalance',
      label: 'Total Balance',
      value: overviewData.value.totalBalance.current,
      change: overviewData.value.totalBalance.change,
      changePercent: overviewData.value.totalBalance.changePercent,
      icon: 'mdi:wallet'
    },
    {
      id: 'monthlyIncome',
      label: 'Monthly Income',
      value: overviewData.value.monthlyIncome.current,
      change: overviewData.value.monthlyIncome.change,
      changePercent: overviewData.value.monthlyIncome.changePercent,
      icon: 'mdi:cash-plus'
    },
    {
      id: 'monthlyExpenses',
      label: 'Monthly Expenses',
      value: overviewData.value.monthlyExpenses.current,
      change: overviewData.value.monthlyExpenses.change,
      changePercent: overviewData.value.monthlyExpenses.changePercent,
      icon: 'mdi:cash-minus'
    },
    {
      id: 'totalSavings',
      label: 'Total Savings',
      value: overviewData.value.totalSavings.current,
      change: overviewData.value.totalSavings.change,
      changePercent: overviewData.value.totalSavings.changePercent,
      icon: 'mdi:piggy-bank'
    }
  ]
})

const fetchOverview = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    const response = await fetch('/api/user/overview', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch overview data')
    }
    
    overviewData.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

const refresh = () => {
  fetchOverview()
}

defineExpose({ refresh })

onMounted(() => {
  fetchOverview()
})
</script>

<template>
  <div class="overview-card">
    <div class="card-header">
      <div class="header-left">
        <Icon name="mdi:view-grid" size="18" />
        <h3>Overview</h3>
      </div>
    </div>

    <div class="separator"></div>

    <div class="card-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="metrics-grid">
        <div v-for="i in 4" :key="i" class="metric-skeleton">
          <div class="skeleton-icon"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line-sm"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <Icon name="mdi:alert-circle" size="24" />
        <span>{{ error }}</span>
        <BaseButton variant="secondary" size="sm" @click="fetchOverview">Retry</BaseButton>
      </div>

      <!-- Empty State -->
      <div v-else-if="!overviewData" class="empty-state">
        <Icon name="mdi:chart-timeline-variant" size="32" class="empty-icon" />
        <span>No overview data available</span>
      </div>

      <!-- Metrics Grid -->
      <div v-else class="metrics-grid">
        <div 
          v-for="metric in metrics" 
          :key="metric.id" 
          class="metric-item"
        >
          <div class="metric-header">
            <Icon :name="metric.icon" size="20" class="metric-icon" />
            <span class="metric-label">{{ metric.label }}</span>
          </div>
          <div class="metric-value">
            {{ formatCurrency(metric.value, overviewData?.currency) }}
          </div>
          <div class="metric-change" :class="getChangeClass(metric.change)">
            <Icon :name="getChangeIcon(metric.change)" size="14" class="change-icon" />
            <span class="change-value">{{ formatCurrency(metric.change, overviewData?.currency) }}</span>
            <span class="change-percent">({{ formatPercent(metric.changePercent) }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
}

.header-left svg {
  opacity: 0.7;
}

h3 {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 12px;
  flex: 1;
}

.metric-item {
  background: var(--color-bg-hover);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: background 0.2s ease;
}

.metric-item:hover {
  background: var(--color-bg-subtle);
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-icon {
  opacity: 0.8;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.05em;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
}

.metric-change.positive {
  color: var(--color-success);
}

.metric-change.negative {
  color: var(--color-error);
}

.metric-change.neutral {
  color: var(--color-text-muted);
}

.change-icon {
  flex-shrink: 0;
}

.change-value {
  font-weight: 500;
}

.change-percent {
  opacity: 0.8;
}

/* Skeleton Loading */
.metric-skeleton {
  background: var(--color-bg-hover);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-icon {
  width: 20px;
  height: 20px;
  background: var(--color-border);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-line {
  height: 20px;
  width: 70%;
  background: var(--color-border);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-line-sm {
  height: 14px;
  width: 50%;
  background: var(--color-border);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 2rem;
  color: var(--color-text-muted);
  text-align: center;
}

.error-state span {
  font-size: 0.875rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 2rem;
  color: var(--color-text-muted);
}

.empty-icon {
  opacity: 0.5;
}

.empty-state span {
  font-size: 0.875rem;
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 1fr);
  }
}
</style>
