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

// Computed properties
const hasAccounts = computed(() => summary.value && summary.value.accountCount > 0)

const netWorthColor = computed(() => {
  if (!summary.value) return 'white'
  return summary.value.netWorth >= 0 ? '#18ffc1' : '#ef4444'
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
    <div class="card-header">
      <h3 class="title">Net Worth</h3>
    </div>
    
    <div v-if="isLoading" class="loading-state">
      Loading...
    </div>
    
    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>
    
    <div v-else-if="!hasAccounts" class="no-accounts">
      No accounts connected
    </div>
    
    <div v-else class="card-content">
      <!-- Net Worth Display -->
      <div class="net-worth-display">
        <span class="net-worth-label">Total Net Worth</span>
        <span class="net-worth-amount" :style="{ color: netWorthColor }">
          {{ summary.netWorth >= 0 ? '' : '-' }}${{ formatCurrency(Math.abs(summary.netWorth)) }}
        </span>
      </div>
      
      <!-- Breakdown -->
      <div class="breakdown">
        <div class="breakdown-item">
          <div class="breakdown-icon assets">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M2 12h20"/>
            </svg>
          </div>
          <div class="breakdown-info">
            <span class="breakdown-label">Assets</span>
            <span class="breakdown-value positive">${{ formatCurrency(summary.totalAssets) }}</span>
          </div>
        </div>
        
        <div class="breakdown-divider"></div>
        
        <div class="breakdown-item">
          <div class="breakdown-icon liabilities">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          <span class="stat-label">Asset Accounts</span>
          <span class="stat-value">{{ assets.length }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Liability Accounts</span>
          <span class="stat-value">{{ liabilities.length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.net-worth-card {
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

.loading-state, .error-state, .no-accounts {
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
  gap: 1.5rem;
  flex: 1;
}

.net-worth-display {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.net-worth-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.net-worth-amount {
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.breakdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.breakdown-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.breakdown-icon.assets {
  background-color: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.breakdown-icon.liabilities {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.breakdown-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.breakdown-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.breakdown-value {
  font-size: 1rem;
  font-weight: 600;
}

.breakdown-value.positive {
  color: #10b981;
}

.breakdown-value.negative {
  color: #ef4444;
}

.breakdown-divider {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: 0.25rem 0;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: auto;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: white;
}
</style>
