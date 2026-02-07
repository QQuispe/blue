<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import { logger } from '~/utils/logger'

const accounts: Ref<any[]> = ref([])
const items: Ref<any[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)
const syncingItem: Ref<string | null> = ref(null)
const disconnectingItem: Ref<string | null> = ref(null)
const showDisconnectConfirm: Ref<string | null> = ref(null)
const linkToken: Ref<string> = ref('')
const isLinkLoading: Ref<boolean> = ref(false)

const route = useRoute()
const router = useRouter()

// Sync accounts for an item
const syncAccounts = async (itemId) => {
  try {
    const response = await fetch('/api/plaid/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    })
    const data = await response.json()
    if (data.statusCode === 200) {
      return true
    } else {
      logger.error('Account sync failed:', data.message)
      return false
    }
  } catch (error) {
    logger.error('Error syncing accounts:', error)
    return false
  }
}

// Sync transactions for an item
const syncTransactions = async (itemId) => {
  try {
    const response = await fetch('/api/plaid/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    })
    const data = await response.json()
    if (data.statusCode === 200) {
      // Transaction sync completed successfully
    } else {
      logger.error('Transaction sync failed:', data.message)
    }
  } catch (error) {
    logger.error('Error syncing transactions:', error)
  }
}

// Initialize Plaid Link
const initializePlaidLink = async () => {
  isLinkLoading.value = true
  try {
    const response = await fetch('/api/plaid/tokens', { method: 'POST' })
    const data = await response.json()
    linkToken.value = data.link_token

    const plaidLink = Plaid.create({
      token: linkToken.value,
      onSuccess: async (public_token) => {
        const accessResponse = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicToken: public_token }),
        })
        const accessData = await accessResponse.json()
        if (accessData.status === 'success') {
          // Refresh accounts list
          await fetchData()
          // First sync accounts (required for transaction sync)
          const accountsSynced = await syncAccounts(accessData.itemId)
          if (accountsSynced) {
            // Then sync transactions
            await syncTransactions(accessData.itemId)
          }
          // Refresh data again after sync
          await fetchData()
        } else {
          logger.error('Error exchanging public token:', accessData.message)
        }
        isLinkLoading.value = false
      },
      onExit: (error) => {
        if (error) {
          logger.error('Error during Plaid Link:', error)
        }
        isLinkLoading.value = false
      },
    })

    plaidLink.open()
  } catch (error) {
    logger.error('Error initializing Plaid Link:', error)
    isLinkLoading.value = false
  }
}

// Fetch accounts and items data
const fetchData = async () => {
  const startTime = Date.now()
  
  try {
    isLoading.value = true
    error.value = null
    
    // Fetch accounts
    const accountsResponse = await fetch('/api/user/balance', {
      credentials: 'include'
    })
    
    if (!accountsResponse.ok) {
      throw new Error('Failed to fetch accounts')
    }
    
    const accountsData = await accountsResponse.json()
    accounts.value = accountsData.accounts || []
    
    // Fetch items (bank connections) for sync status
    const itemsResponse = await fetch('/api/user/items', {
      credentials: 'include'
    })
    
    if (itemsResponse.ok) {
      const itemsData = await itemsResponse.json()
      items.value = itemsData.items || []
    }
    
    logger.api('GET', '/api/user/balance', 200, Date.now() - startTime, { 
      accountCount: accounts.value.length 
    })
    
  } catch (err) {
    logger.error('AccountManagement fetch failed', {
      error: err.message,
      path: route.path
    })
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

// Sync specific item
const syncItem = async (itemId) => {
  syncingItem.value = itemId
  
  try {
    logger.action('manual_sync_item', { itemId })
    
    const response = await fetch('/api/plaid/transactions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    })
    
    if (!response.ok) {
      throw new Error('Sync failed')
    }
    
    const data = await response.json()
    
    logger.success('Item synced successfully', {
      itemId,
      added: data.stats?.added,
      modified: data.stats?.modified
    })
    
    // Refresh data
    await fetchData()
    
    // Show success toast
    const { $toast } = useNuxtApp()
    $toast.success(`Sync completed! Added: ${data.stats?.added || 0}, Modified: ${data.stats?.modified || 0}`)
    
  } catch (err) {
    logger.error('Sync failed', { error: err.message, itemId })
    const { $toast } = useNuxtApp()
    $toast.error('Sync failed: ' + err.message)
  } finally {
    syncingItem.value = null
  }
}

// Disconnect item
const disconnectItem = async (itemId) => {
  if (!showDisconnectConfirm.value === itemId) {
    showDisconnectConfirm.value = itemId
    return
  }
  
  disconnectingItem.value = itemId
  
  try {
    logger.action('disconnect_item', { itemId })
    
    const response = await fetch(`/api/user/items/${itemId}/disconnect`, {
      method: 'POST',
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Disconnect failed')
    }
    
    logger.success('Item disconnected successfully', { itemId })
    
    // Refresh data
    await fetchData()
    
    showDisconnectConfirm.value = null
    const { $toast } = useNuxtApp()
    $toast.success('Bank connection removed successfully')
    
  } catch (err) {
    logger.error('Disconnect failed', { error: err.message, itemId })
    const { $toast } = useNuxtApp()
    $toast.error('Disconnect failed: ' + err.message)
  } finally {
    disconnectingItem.value = null
  }
}

// Cancel disconnect
const cancelDisconnect = () => {
  showDisconnectConfirm.value = null
}

// Get item for account
const getItemForAccount = (account) => {
  return items.value.find(item => item.id === account.item_id)
}

// Get last sync status for account
const getSyncStatus = (account) => {
  const item = getItemForAccount(account)
  if (!item) return { status: 'unknown', lastSync: null }
  
  // Calculate time since last sync
  const lastSync = item.last_synced_at ? new Date(item.last_synced_at) : null
  const now = new Date()
  
  if (!lastSync) {
    return { status: 'never', lastSync: null }
  }
  
  const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60)
  
  if (hoursSinceSync < 1) {
    return { status: 'fresh', lastSync, text: 'Just now' }
  } else if (hoursSinceSync < 24) {
    return { status: 'recent', lastSync, text: `${Math.floor(hoursSinceSync)} hours ago` }
  } else {
    const days = Math.floor(hoursSinceSync / 24)
    return { status: 'stale', lastSync, text: `${days} day${days > 1 ? 's' : ''} ago` }
  }
}

// Get account insights
const getAccountInsights = (account) => {
  // This would come from an API in production
  // For now, return mock data structure
  return {
    transactionCount: Math.floor(Math.random() * 50) + 10,
    lastTransaction: '2 hours ago',
    health: Math.random() > 0.3 ? 'good' : 'needs_attention'
  }
}

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00'
  }
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Get account type style
const getAccountTypeStyle = (type) => {
  const styles = {
    depository: { color: 'var(--color-account-depository)', icon: '🏦', label: 'Bank Account' },
    credit: { color: 'var(--color-account-credit)', icon: '💳', label: 'Credit Card' },
    loan: { color: 'var(--color-account-loan)', icon: '📄', label: 'Loan' },
    investment: { color: 'var(--color-account-investment)', icon: '📈', label: 'Investment' },
    other: { color: 'var(--color-account-other)', icon: '🏛️', label: 'Other' }
  }
  return styles[type] || styles.other
}

// Group accounts by bank connection (item)
const groupedAccounts = computed(() => {
  const groups = {}
  accounts.value.forEach(account => {
    const item = getItemForAccount(account)
    // Use item_id as the key to ensure each bank connection is separate
    const itemId = account.item_id || item?.id || 'unknown'
    
    if (!groups[itemId]) {
      groups[itemId] = {
        item: item,
        institutionName: item?.institution_name || item?.plaid_institution_id || account.item_id || 'Unknown Bank',
        accounts: []
      }
    }
    groups[itemId].accounts.push(account)
  })
  return groups
})

// Calculate balance breakdown
const totalAssets = computed(() => {
  return accounts.value
    .filter(acc => acc.type === 'depository' || acc.type === 'investment')
    .reduce((sum, acc) => sum + (Number(acc.currentBalance) || 0), 0)
})

const totalLiabilities = computed(() => {
  return accounts.value
    .filter(acc => acc.type === 'credit' || acc.type === 'loan')
    .reduce((sum, acc) => sum + (Number(acc.currentBalance) || 0), 0)
})

const netWorth = computed(() => {
  return totalAssets.value - totalLiabilities.value
})

const formattedAssets = computed(() => formatCurrency(totalAssets.value))
const formattedLiabilities = computed(() => formatCurrency(totalLiabilities.value))
const formattedNetWorth = computed(() => formatCurrency(netWorth.value))

// Total accounts count
const totalAccounts = computed(() => accounts.value.length)

// Connected institutions count
const totalInstitutions = computed(() => Object.keys(groupedAccounts.value).length)

onMounted(() => {
  logger.navigation('dashboard', '/dashboard/balance', { via: 'router' })
  fetchData()
})
</script>

<template>
  <div class="account-management-page">
    <!-- Header -->
    <div class="page-header">
      <NuxtLink to="/" class="back-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        <span>Back to Dashboard</span>
      </NuxtLink>
      <h1 class="page-title">Connected Accounts</h1>
      <p class="page-subtitle">Manage your bank connections and account health</p>
    </div>
    
    <!-- Summary Bar -->
    <div class="summary-bar">
      <div class="summary-section">
        <div class="summary-item">
          <span class="summary-value">{{ totalInstitutions }}</span>
          <span class="summary-label">Banks</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-value">{{ totalAccounts }}</span>
          <span class="summary-label">Accounts</span>
        </div>
      </div>
      
      <div class="summary-divider vertical"></div>
      
      <div class="summary-section balances">
        <div class="balance-group">
          <span class="balance-value positive">${{ formattedAssets }}</span>
          <span class="balance-label">Cash & Assets</span>
        </div>
        <div v-if="totalLiabilities > 0" class="balance-group">
          <span class="balance-value negative">${{ formattedLiabilities }}</span>
          <span class="balance-label">Credit & Debt</span>
        </div>
      </div>
      
      <div class="summary-actions">
        <button class="add-account-btn" @click="initializePlaidLink" :disabled="isLinkLoading" title="Connect Bank">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span class="btn-text">{{ isLinkLoading ? 'Processing...' : 'Connect Bank' }}</span>
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading your accounts...</span>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button @click="fetchData" class="retry-btn">Retry</button>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="accounts.length === 0" class="empty-state">
      <div class="empty-icon">🏦</div>
      <h3>No accounts connected</h3>
      <p>Connect your bank accounts to start tracking your finances</p>
      <button class="add-account-btn" @click="initializePlaidLink" :disabled="isLinkLoading">
        {{ isLinkLoading ? 'Processing...' : 'Connect Your First Bank' }}
      </button>
    </div>
    
    <!-- Content -->
    <div v-else class="content">
      <!-- Institution Groups -->
      <div class="institutions-list">
        <div 
          v-for="(group, itemId) in groupedAccounts" 
          :key="itemId"
          class="institution-card"
        >
          <!-- Institution Header -->
          <div class="institution-header">
            <div class="institution-info">
              <h2 class="institution-name">{{ group.institutionName }}</h2>
              <span class="institution-meta">{{ group.accounts.length }} account{{ group.accounts.length === 1 ? '' : 's' }}</span>
            </div>
            <div class="institution-actions">
              <button 
                @click="syncItem(group.item?.plaid_item_id)"
                :disabled="syncingItem === group.item?.plaid_item_id"
                class="action-btn sync-btn"
                :class="{ 'is-syncing': syncingItem === group.item?.plaid_item_id }"
              >
                <svg v-if="syncingItem !== group.item?.plaid_item_id" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                <span v-if="syncingItem === group.item?.plaid_item_id">Syncing...</span>
                <span v-else>Sync</span>
              </button>
              
              <button 
                v-if="showDisconnectConfirm !== group.item?.id"
                @click="disconnectItem(group.item?.id)"
                class="action-btn disconnect-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>
                </svg>
                Disconnect
              </button>
              
              <div v-else class="confirm-actions">
                <span class="confirm-text">Sure?</span>
                <button 
                  @click="disconnectItem(group.item?.id)"
                  :disabled="disconnectingItem === group.item?.id"
                  class="action-btn confirm-btn"
                >
                  {{ disconnectingItem === group.item?.id ? 'Removing...' : 'Yes' }}
                </button>
                <button @click="cancelDisconnect" class="action-btn cancel-btn">No</button>
              </div>
            </div>
          </div>
          
          <!-- Sync Status -->
          <div class="sync-status-bar">
            <div 
              class="sync-indicator"
              :class="getSyncStatus(group.accounts[0]).status"
            >
              <span class="sync-dot"></span>
              <span class="sync-text">{{ getSyncStatus(group.accounts[0]).text }}</span>
            </div>
            <span v-if="group.item?.error" class="error-badge">⚠️ Sync error</span>
          </div>
          
          <!-- Accounts List -->
          <div class="accounts-list">
            <div 
              v-for="account in group.accounts" 
              :key="account.id"
              class="account-row"
            >
              <div class="account-info">
                <div 
                  class="account-icon"
                  :style="{ color: getAccountTypeStyle(account.type).color }"
                >
                  {{ getAccountTypeStyle(account.type).icon }}
                </div>
                <div class="account-details">
                  <span class="account-name">{{ account.name }}</span>
                  <span class="account-type">{{ getAccountTypeStyle(account.type).label }}</span>
                  <span v-if="account.mask" class="account-mask">•••• {{ account.mask }}</span>
                </div>
              </div>
              
              <div class="account-balance">
                <span class="balance-amount" :class="{ 'negative': account.currentBalance < 0 }">
                  <span v-if="account.currentBalance < 0">-</span>${{ formatCurrency(Math.abs(account.currentBalance || 0)) }}
                </span>
                <span v-if="account.availableBalance !== account.currentBalance" class="available-balance">
                  ${{ formatCurrency(account.availableBalance || 0) }} available
                </span>
              </div>
              
              <div class="account-health">
                <div class="health-indicator" :class="getAccountInsights(account).health">
                  <span class="health-dot"></span>
                  <span class="health-text">{{ getAccountInsights(account).health === 'good' ? 'Healthy' : 'Review' }}</span>
                </div>
                <span class="activity-meta">{{ getAccountInsights(account).transactionCount }} txns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tips Section -->
      <div class="tips-section">
        <h3>💡 Tips</h3>
        <ul>
          <li>Sync your accounts regularly to keep data fresh</li>
          <li>Accounts with "Review" status may have sync issues</li>
          <li>You can reconnect a bank anytime if disconnected</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-management-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

/* Header */
.page-header {
  margin-bottom: 2rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-decoration: none;
  margin-bottom: 0.75rem;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: var(--color-primary);
}

.page-title {
  color: var(--color-text-primary);
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin: 0;
}

/* Summary Bar */
.summary-bar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 2rem;
}

.summary-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.summary-section.balances {
  flex: 1;
  justify-content: center;
  gap: 2rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-value {
  color: var(--color-text-primary);
  font-size: 1.25rem;
  font-weight: 600;
}

.summary-label {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-divider {
  width: 1px;
  height: 40px;
  background: var(--color-bg-card);
}

.summary-divider.vertical {
  height: 50px;
}

.balance-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.balance-group.net {
  padding: 0.5rem 1rem;
  background: var(--color-bg-card);
  border-radius: 8px;
}

.balance-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.balance-value.positive {
  color: var(--color-success);
}

.balance-value.negative {
  color: var(--color-error);
}

.balance-label {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-actions {
  margin-left: auto;
}

.add-account-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  color: var(--color-bg-primary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-account-btn:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

/* Loading & Error States */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 0;
  color: var(--color-text-muted);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}


.error-state {
  color: var(--color-error);
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
  border-radius: 6px;
  color: var(--color-error);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: color-mix(in srgb, var(--color-error) 20%, transparent);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4rem 2rem;
  background: var(--color-bg-primary);
  border: 2px dashed var(--color-border);
  border-radius: 16px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  color: var(--color-text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin: 0 0 1.5rem 0;
  max-width: 300px;
}

/* Institutions List */
.institutions-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.institution-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

/* Institution Header */
.institution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
}

.institution-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.institution-name {
  color: var(--color-text-primary);
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.institution-meta {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.institution-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: color-mix(in srgb, var(--color-info) 60%, transparent);
  color: white;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sync-btn:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
  color: var(--color-primary);
}

.sync-btn.is-syncing {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
}

.disconnect-btn:hover {
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-error) 30%, transparent);
  color: var(--color-error);
}

.confirm-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confirm-text {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.confirm-btn {
  background: color-mix(in srgb, var(--color-error) 20%, transparent);
  border-color: color-mix(in srgb, var(--color-error) 40%, transparent);
  color: var(--color-error);
}

.confirm-btn:hover {
  background: color-mix(in srgb, var(--color-error) 30%, transparent);
}

.cancel-btn:hover {
  background: color-mix(in srgb, var(--color-text-primary) 15%, transparent);
}

/* Sync Status Bar */
.sync-status-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.sync-indicator.fresh .sync-dot {
  background: var(--color-primary);
  box-shadow: 0 0 8px var(--color-primary);
}

.sync-indicator.recent .sync-dot {
  background: var(--color-info);
}

.sync-indicator.stale .sync-dot {
  background: var(--color-warning);
}

.sync-indicator.never .sync-dot {
  background: #6b7280;
}

.sync-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.error-badge {
  font-size: 0.75rem;
  color: var(--color-error);
  padding: 0.25rem 0.5rem;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border-radius: 4px;
}

/* Accounts List */
.accounts-list {
  padding: 0.75rem;
}

.account-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg-primary);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  transition: background 0.2s ease;
}

.account-row:hover {
  background: var(--color-bg-card);
}

.account-row:last-child {
  margin-bottom: 0;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.account-icon {
  font-size: 1.25rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border-radius: 8px;
}

.account-details {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.account-name {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
}

.account-type {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.account-mask {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.account-balance {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
}

.balance-amount {
  color: var(--color-success);
  font-size: 0.875rem;
  font-weight: 600;
}

.balance-amount.negative {
  color: var(--color-error);
}

.available-balance {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.account-health {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.health-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.health-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.health-indicator.good .health-dot {
  background: var(--color-primary);
}

.health-indicator.needs_attention .health-dot {
  background: var(--color-warning);
}

.health-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.activity-meta {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* Tips Section */
.tips-section {
  margin-top: 2rem;
  padding: 1.25rem;
  background: color-mix(in srgb, var(--color-primary) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 12px;
}

.tips-section h3 {
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
}

.tips-section ul {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.tips-section li {
  margin-bottom: 0.5rem;
}

.tips-section li:last-child {
  margin-bottom: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .account-management-page {
    padding: 1rem;
  }
  
  .summary-bar {
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .summary-divider {
    display: none;
  }
  
  .account-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .account-balance,
  .account-health {
    align-items: flex-start;
  }
}

/* Responsive summary bar */
@media (max-width: 900px) {
  .summary-bar {
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .summary-actions {
    margin-left: 0;
    width: 100%;
  }
  
  .add-account-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 600px) {
  .btn-text {
    display: none;
  }
  
  .add-account-btn {
    padding: 0.625rem;
  }
}
</style>