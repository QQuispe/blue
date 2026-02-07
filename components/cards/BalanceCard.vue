<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import { logger } from '~/utils/logger'

interface BalanceData {
  summary: {
    totalCurrent: number;
    totalAvailable: number;
    accountCount: number;
    currency: string;
  };
  accounts: Array<{
    id: number;
    name: string;
    type: string;
    currentBalance: number;
    availableBalance: number;
    currency: string;
  }>;
}

const balanceData: Ref<BalanceData | null> = ref(null)
const accounts: Ref<any[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)

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
      logger.api('GET', '/api/user/balance', response.status, duration)
      throw new Error('Failed to fetch balance')
    }
    
    const data = await response.json()
    balanceData.value = data.summary
    accounts.value = data.accounts || []
    
    logger.api('GET', '/api/user/balance', response.status, duration)
    logger.component('BalanceCard', 'fetch_success', { 
      accountsFetched: accounts.value.length,
      balance: balanceData.value?.summary?.totalCurrent
    })
  } catch (err) {
    const duration = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Failed to fetch balance data', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : 'No stack trace',
      duration
    })
    error.value = errorMessage
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
  logger.info('refresh_balance_card', { component: 'BalanceCard' })
  fetchBalance()
}

defineExpose({ refresh })

// Navigate to full page
const navigateToFullPage = () => {
  logger.info('navigate_to_balance_fullpage', { from: route.path })
  logger.navigation(route.path, '/dashboard/balance')
  router.push('/dashboard/balance')
}

// Computed properties for display - show Total Assets only (depository + investment accounts)
const displayBalance = computed(() => {
  if (!balanceData.value) {
    return { amount: 0, currency: 'USD', accountCount: 0 }
  }
  
  // Calculate total assets (depository and investment accounts only)
  const filteredAccounts = accounts.value.filter(acc => acc.type === 'depository' || acc.type === 'investment')
  const totalAssets = filteredAccounts.reduce((sum, acc) => sum + (Number(acc.currentBalance) || 0), 0)
  
  return {
    amount: totalAssets,
    currency: balanceData.value?.summary?.currency || 'USD',
    accountCount: filteredAccounts.length
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
const formatAccountBalance = (balance: number): string => {
  return balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Get account type icon/color
const getAccountTypeStyle = (type: string) => {
  const styles: Record<string, { color: string; icon: string }> = {
    depository: { color: 'var(--color-account-depository)', icon: '💳' },
    credit: { color: 'var(--color-account-credit)', icon: '💳' },
    loan: { color: 'var(--color-account-loan)', icon: '📄' },
    investment: { color: 'var(--color-account-investment)', icon: '📈' },
    other: { color: 'var(--color-account-other)', icon: '💰' }
  }
  return styles[type] || styles.other
}
</script>

<template>
  <div class="balance-card">
    <!-- Header Row: Title left, Value right -->
    <div class="card-header-row">
      <h3 class="title">Total Assets</h3>
      <div v-if="!isLoading && !error && displayBalance.amount > 0" class="header-value">
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
      <div v-if="displayBalance.amount === 0" class="no-accounts">
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
            <div class="account-balance" :class="{ 'negative': account.type === 'credit' ? account.currentBalance > 0 : account.currentBalance < 0 }">
              <span v-if="account.type === 'credit' ? account.currentBalance > 0 : account.currentBalance < 0">-</span>${{ formatAccountBalance(Math.abs(account.currentBalance)) }}
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
  flex: 1;
}

.accounts-section {
  flex: 1;
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
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}

.header-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-success);
  letter-spacing: -0.01em;
}

/* Minimal separator */
.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
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
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-success);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}


.error-state {
  color: var(--color-error);
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
  color: var(--color-text-primary);
  font-size: 0.875rem;
  margin: 0;
}

.empty-hint {
  color: var(--color-text-secondary);
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
  background: var(--color-bg-card);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.account-item:hover {
  background: var(--color-bg-hover);
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
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-type {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  text-transform: capitalize;
}

.account-balance {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-success);
  flex-shrink: 0;
}

.account-balance.negative {
  color: var(--color-error);
}

.more-accounts-hint {
  text-align: center;
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
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
  border: 1px solid var(--color-primary-border);
  border-radius: 6px;
  color: var(--color-primary);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-details-btn:hover {
  background: var(--color-primary-bg-subtle);
  border-color: var(--color-primary-border-hover);
}

.view-details-btn svg {
  transition: transform 0.2s ease;
}

.view-details-btn:hover svg {
  transform: translateX(2px);
}
</style>
