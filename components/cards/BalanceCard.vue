<script setup>
import { ref, onMounted, computed } from 'vue'
import { logger } from '~/utils/logger.js'

const balanceData = ref(null)
const accounts = ref([])
const isLoading = ref(true)
const error = ref(null)

const route = useRoute()
const router = useRouter()

// Fetch balance data from API
const fetchBalance = async () => {
  const startTime = Date.now()
  try {
    isLoading.value = true
    error.value = null
    
    logger.component('BalanceCard', 'fetch_start', { timestamp: new Date().toISOString() })
    
    const response = await fetch('/api/user/balance', {
      credentials: 'include'
    })
    
    const duration = Date.now() - startTime
    
    if (!response.ok) {
      logger.api('GET', '/api/user/balance', response.status, duration, { error: 'Request failed' })
      throw new Error('Failed to fetch balance')
    }
    
    const data = await response.json()
    balanceData.value = data.summary
    accounts.value = data.accounts || []
    
    logger.api('GET', '/api/user/balance', response.status, duration, { 
      accountCount: data.accounts?.length || 0,
      totalBalance: data.summary?.totalCurrent 
    })
    logger.component('BalanceCard', 'fetch_success', { 
      accountsLoaded: accounts.value.length,
      duration 
    })
  } catch (err) {
    const duration = Date.now() - startTime
    logger.error('Failed to fetch balance data', {
      error: err.message,
      stack: err.stack,
      duration
    })
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  logger.component('BalanceCard', 'mounted', { 
    path: route.path,
    timestamp: new Date().toISOString()
  })
  fetchBalance()
})

// Expose refresh method for parent component
const refresh = () => {
  logger.action('refresh_balance_card')
  fetchBalance()
}

defineExpose({ refresh })

// Navigate to full page
const navigateToFullPage = () => {
  logger.action('navigate_to_balance_fullpage', { from: route.path })
  logger.navigation(route.path, '/dashboard/balance')
  router.push('/dashboard/balance')
}

// Computed properties for display
const displayBalance = computed(() => {
  if (!balanceData.value) return { amount: 0, currency: 'USD', accountCount: 0 }
  
  return {
    amount: balanceData.value.totalCurrent,
    currency: balanceData.value.currency,
    accountCount: balanceData.value.accountCount
  }
})

const formattedAmount = computed(() => {
  return displayBalance.value.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})

// Get top 3 accounts for mini list
const topAccounts = computed(() => {
  return accounts.value.slice(0, 3)
})

// Check if there are more accounts
const hasMoreAccounts = computed(() => {
  return accounts.value.length > 3
})

// Format individual account balance
const formatAccountBalance = (balance) => {
  return balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Get account type icon/color
const getAccountTypeStyle = (type) => {
  const styles = {
    depository: { color: '#3EB489', icon: '💳' },
    credit: { color: '#ef4444', icon: '💳' },
    loan: { color: '#f59e0b', icon: '📄' },
    investment: { color: '#3b82f6', icon: '📈' },
    other: { color: '#6b7280', icon: '🏦' }
  }
  return styles[type] || styles.other
}
</script>

<template>
  <div class="balance-card">
    <!-- Header Row: Title left, Value right -->
    <div class="card-header-row">
      <h3 class="title">Balance</h3>
      <div v-if="!isLoading && !error && displayBalance.accountCount > 0" class="header-value">
        ${{ formattedAmount }}
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
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ error }}</span>
    </div>
    
    <!-- Content -->
    <div v-else class="card-content">
      <!-- No Accounts State -->
      <div v-if="displayBalance.accountCount === 0" class="no-accounts">
        <div class="empty-icon">🏦</div>
        <p>No connected accounts</p>
        <span class="empty-hint">Connect a bank to see your balance</span>
      </div>
      
      <!-- Account List -->
      <div v-else class="accounts-section">
        <div class="accounts-list">
          <div 
            v-for="account in topAccounts" 
            :key="account.id"
            class="account-item"
            @click="navigateToFullPage"
          >
            <div class="account-icon" :style="{ backgroundColor: getAccountTypeStyle(account.type).color + '20', color: getAccountTypeStyle(account.type).color }">
              <span>{{ getAccountTypeStyle(account.type).icon }}</span>
            </div>
            <div class="account-info">
              <span class="account-name">{{ account.name }}</span>
              <span class="account-type">{{ account.type }}</span>
            </div>
            <div class="account-balance" :class="{ 'negative': account.currentBalance < 0 }">
              <span v-if="account.currentBalance < 0">-</span>${{ formatAccountBalance(Math.abs(account.currentBalance)) }}
            </div>
          </div>
          
          <!-- Show more indicator -->
          <div v-if="hasMoreAccounts" class="more-accounts-hint">
            +{{ accounts.length - 3 }} more
          </div>
        </div>
        
        <!-- View Full Details Link -->
        <div class="card-footer">
          <button @click="navigateToFullPage" class="view-details-btn">
            <span>View Full Details</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.balance-card {
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
  color: #3EB489;
  letter-spacing: -0.01em;
}

/* Minimal separator */
.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  margin: 0;
}

/* Loading & Error States */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
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

/* Content */
.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* Empty State */
.no-accounts {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
  text-align: center;
}

.empty-icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

.no-accounts p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  margin: 0;
}

.empty-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
}

/* Accounts Section */
.accounts-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  background: #151515;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.account-item:hover {
  background: #1a1a1a;
  transform: translateX(2px);
}

.account-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.account-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.account-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-type {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: capitalize;
}

.account-balance {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #3EB489;
  flex-shrink: 0;
}

.account-balance.negative {
  color: #ef4444;
}

.more-accounts-hint {
  text-align: center;
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  padding: 0.125rem 0;
}

/* Footer */
.card-footer {
  padding-top: 0.25rem;
}

.view-details-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem;
  background: transparent;
  border: 1px solid rgba(62, 180, 137, 0.3);
  border-radius: 6px;
  color: #3EB489;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-details-btn:hover {
  background: rgba(62, 180, 137, 0.1);
  border-color: rgba(62, 180, 137, 0.5);
}

.view-details-btn svg {
  transition: transform 0.2s ease;
}

.view-details-btn:hover svg {
  transform: translateX(2px);
}
</style>
