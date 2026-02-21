<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'

interface OverviewMetric {
  current: number
  previous: number
  change: number
  changePercent: number
}

interface OverviewData {
  totalBalance: OverviewMetric
  monthlyIncome: OverviewMetric
  monthlyExpenses: OverviewMetric
  totalSavings: OverviewMetric
  currency: string
  currentMonth: string
  previousMonth: string
}

const isLoading: Ref<boolean> = ref(false)
const error: Ref<string | null> = ref(null)
const overviewData: Ref<OverviewData | null> = ref(null)

const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))
}

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

const getChangeClass = (change: number): string => {
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return 'neutral'
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
      icon: 'mdi:wallet',
      accentColor: 'var(--color-accent)',
    },
    {
      id: 'monthlyIncome',
      label: 'Monthly Income',
      value: overviewData.value.monthlyIncome.current,
      change: overviewData.value.monthlyIncome.change,
      changePercent: overviewData.value.monthlyIncome.changePercent,
      icon: 'mdi:cash-plus',
      accentColor: 'var(--color-success)',
    },
    {
      id: 'monthlyExpenses',
      label: 'Monthly Expenses',
      value: overviewData.value.monthlyExpenses.current,
      change: overviewData.value.monthlyExpenses.change,
      changePercent: overviewData.value.monthlyExpenses.changePercent,
      icon: 'mdi:cash-minus',
      accentColor: 'var(--color-error)',
    },
    {
      id: 'totalSavings',
      label: 'Total Savings',
      value: overviewData.value.totalSavings.current,
      change: overviewData.value.totalSavings.change,
      changePercent: overviewData.value.totalSavings.changePercent,
      icon: 'mdi:piggy-bank',
      accentColor: 'var(--color-info)',
    },
  ]
})

const fetchOverview = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await fetch('/api/finance/overview', {
      credentials: 'include',
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
  // Don't auto-fetch; parent Dashboard will call refresh()
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
          <div class="skeleton-header">
            <div class="skeleton-icon"></div>
            <div class="skeleton-label"></div>
          </div>
          <div class="skeleton-value"></div>
          <div class="skeleton-change"></div>
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
          :style="{ '--accent-color': metric.accentColor }"
        >
          <div class="metric-top">
            <div class="metric-icon-wrapper">
              <Icon :name="metric.icon" size="18" class="metric-icon" />
            </div>
            <div class="metric-info">
              <span class="metric-label">{{ metric.label }}</span>
              <div class="metric-value">
                {{ formatCurrency(metric.value, overviewData?.currency) }}
              </div>
            </div>
          </div>
          <div class="metric-change" :class="getChangeClass(metric.change)">
            <span class="change-value">{{
              formatCurrency(metric.change, overviewData?.currency)
            }}</span>
            <span class="change-percent">{{ formatPercent(metric.changePercent) }}</span>
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
  gap: 16px;
  flex: 1;
}

.metric-item {
  background: var(--color-bg-elevated);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.metric-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent-color, var(--color-accent));
  opacity: 0.6;
}

.metric-item:hover {
  transform: translateY(-2px);
}

.metric-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.metric-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-color, var(--color-accent)) 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon {
  color: var(--accent-color, var(--color-accent));
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.metric-label {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
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

.change-value {
  font-weight: 600;
}

.change-percent {
  opacity: 0.8;
  font-weight: 500;
}

/* Skeleton Loading */
.metric-skeleton {
  background: var(--color-bg-elevated);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skeleton-icon {
  width: 36px;
  height: 36px;
  background: var(--color-border);
  border-radius: 10px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-label {
  width: 80px;
  height: 12px;
  background: var(--color-border);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-value {
  height: 32px;
  width: 60%;
  background: var(--color-border);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-change {
  height: 16px;
  width: 40%;
  background: var(--color-border);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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
    grid-template-rows: repeat(4, auto);
    gap: 12px;
  }

  .metric-value {
    font-size: 1.25rem;
  }
}
</style>
