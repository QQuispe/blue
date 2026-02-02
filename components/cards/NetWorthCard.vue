<script setup>
import { ref, onMounted, computed } from 'vue'

const summary = ref(null)
const assets = ref([])
const liabilities = ref([])
const isLoading = ref(true)
const error = ref(null)

// Fetch net worth data from API
const fetchNetWorth = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await fetch('/api/user/net-worth', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch net worth')
    }
    
    const data = await response.json()
    summary.value = data.summary
    assets.value = data.assets
    liabilities.value = data.liabilities
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

// Expose refresh method for parent component
const refresh = () => {
  fetchNetWorth()
}

defineExpose({ refresh })

// Computed properties
const hasAccounts = computed(() => summary.value && summary.value.accountCount > 0)

const netWorthColor = computed(() => {
  if (!summary.value) return 'white'
  return summary.value.netWorth >= 0 ? '#3EB489' : '#ef4444'
})

const formatCurrency = (amount) => {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
</script>

<template>
  <div class="net-worth-card">
    <!-- Header Row: Title left, Value right -->
    <div class="card-header-row">
      <h3 class="title">Net Worth</h3>
      <div v-if="!isLoading && !error && hasAccounts" class="header-value" :style="{ color: netWorthColor }">
        {{ summary.netWorth >= 0 ? '' : '-' }}${{ formatCurrency(Math.abs(summary.netWorth)) }}
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
    
    <!-- No Accounts State -->
    <div v-else-if="!hasAccounts" class="no-accounts">
      <div class="empty-icon">📊</div>
      <p>No accounts connected</p>
    </div>
    
    <!-- Content -->
    <div v-else class="card-content">
      <!-- Breakdown -->
      <div class="breakdown">
        <div class="breakdown-item">
          <div class="breakdown-icon assets">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M2 12h20"/>
            </svg>
          </div>
          <div class="breakdown-info">
            <span class="breakdown-label">Assets</span>
            <span class="breakdown-value positive">${{ formatCurrency(summary.totalAssets) }}</span>
          </div>
        </div>
        
        <div class="breakdown-item">
          <div class="breakdown-icon liabilities">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
            </svg>
          </div>
          <div class="breakdown-info">
            <span class="breakdown-label">Liabilities</span>
            <span class="breakdown-value negative">${{ formatCurrency(summary.totalLiabilities) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat">
          <span class="stat-value">{{ assets.length }}</span>
          <span class="stat-label">Asset Accounts</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ liabilities.length }}</span>
          <span class="stat-label">Liability Accounts</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.net-worth-card {
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
  letter-spacing: -0.01em;
}

/* Minimal separator */
.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  margin: 0;
}

/* Loading & Error States */
.loading-state, .error-state, .no-accounts {
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

.no-accounts .empty-icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

.no-accounts p {
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

/* Breakdown */
.breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.breakdown-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  background: #151515;
  border-radius: 6px;
}

.breakdown-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.breakdown-icon.assets {
  background-color: rgba(16, 185, 129, 0.2);
  color: #3EB489;
}

.breakdown-icon.liabilities {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.breakdown-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
}

.breakdown-label {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.breakdown-value {
  font-size: 0.9375rem;
  font-weight: 600;
}

.breakdown-value.positive {
  color: #3EB489;
}

.breakdown-value.negative {
  color: #ef4444;
}

/* Quick Stats */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.5rem;
  background-color: #151515;
  border-radius: 6px;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.stat-label {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
</style>
