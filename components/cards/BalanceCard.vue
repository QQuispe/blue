<script setup>
import { ref, onMounted, computed } from 'vue'
import { logger } from '~/utils/logger.js'

const balanceData = ref(null)
const accounts = ref([])
const isLoading = ref(true)
const error = ref(null)
const isExpanded = ref(false)

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

// Toggle expand state
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
  logger.action('toggle_balance_card_expand', { expanded: isExpanded.value })
}

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
  <div class="balance-card" :class="{ 'is-expanded': isExpanded }">
    <!-- Header -->
    <div class="balance-header">
      <div class="header-left">
        <h3 class="title">Total Balance</h3>
        <span v-if="displayBalance.accountCount > 0 && !isExpanded" class="account-count">
          {{ displayBalance.accountCount }} accounts
        </span>
      </div>
      <div class="header-actions">
        <button 
          v-if="accounts.length > 0" 
          @click="toggleExpand"
          class="expand-btn"
          :aria-label="isExpanded ? 'Collapse' : 'Expand'"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
            :class="{ 'rotated': isExpanded }"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading balance...</span>
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
      <!-- Main Balance Display -->
      <div class="balance-display">
        <span class="currency">{{ displayBalance.currency }}</span>
        <span class="amount">{{ formattedAmount }}</span>
      </div>
      
      <!-- No Accounts State -->
      <div v-if="displayBalance.accountCount === 0" class="no-accounts">
        <div class="empty-icon">🏦</div>
        <p>No connected accounts</p>
        <span class="empty-hint">Connect a bank to see your balance</span>
      </div>
      
      <!-- Mini Account List (Collapsible) -->
      <div v-else class="accounts-section">
        <div 
          class="accounts-list"
          :class="{ 'is-expanded': isExpanded }"
        >
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
          <div v-if="hasMoreAccounts && !isExpanded" class="more-accounts-hint">
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
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.3s ease;
}

.balance-card.is-expanded {
  gap: 1.5rem;
}

/* Header */
.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}

.account-count {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.expand-btn {
  background: #151515;
  border: none;
  border-radius: 6px;
  padding: 0.375rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-btn:hover {
  background: rgba(56, 111, 164, 0.6);
  color: white;
}

.expand-btn svg {
  transition: transform 0.3s ease;
}

.expand-btn svg.rotated {
  transform: rotate(180deg);
}

/* Loading & Error States */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
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

/* Content */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
}

/* Balance Display */
.balance-display {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.currency {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.amount {
  font-size: 2.5rem;
  font-weight: 700;
  color: #3EB489;
  letter-spacing: -0.02em;
  line-height: 1;
}

/* Empty State */
.no-accounts {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 0;
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.no-accounts p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  margin: 0;
}

.empty-hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
}

/* Accounts Section */
.accounts-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: #151515;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.account-item:hover {
  background: #1a1a1a;
  transform: translateX(2px);
}

.account-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
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
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-type {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: capitalize;
}

.account-balance {
  font-size: 0.875rem;
  font-weight: 600;
  color: #3EB489;
  flex-shrink: 0;
}

.account-balance.negative {
  color: #ef4444;
}

.more-accounts-hint {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  padding: 0.25rem 0;
}

/* Footer */
.card-footer {
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.view-details-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem;
  background: transparent;
  border: 1px solid rgba(62, 180, 137, 0.3);
  border-radius: 6px;
  color: #3EB489;
  font-size: 0.875rem;
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
