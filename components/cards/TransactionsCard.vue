<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import { getLogger } from '~/utils/logger'
const logger = getLogger()
import { getCategoryColor } from '~/composables/useCategoryColors'
import BaseButton from '~/components/BaseButton.vue'

interface Transaction {
  id: number;
  date: string;
  name: string;
  amount: number;
  category: string | null;
  categoryPrimary: string | null;
  logo_url: string | null;
  account_id: number;
}

const transactions: Ref<Transaction[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)

const router = useRouter()

const fetchTransactions = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    logger.component('TransactionsCard', 'fetch_start', { timestamp: new Date().toISOString() })
    
    const response = await fetch('/api/user/transactions?limit=5', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch transactions')
    }
    
    const data = await response.json()
    transactions.value = data.transactions || []
    
    logger.component('TransactionsCard', 'fetch_success', { count: transactions.value.length })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Failed to fetch transactions', { error: errorMessage })
    error.value = errorMessage
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchTransactions()
})

// Expose refresh method for parent component
const refresh = () => {
  fetchTransactions()
}

defineExpose({ refresh })

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatAmount = (amount: number): string => {
  const formatted = Math.abs(amount).toFixed(2)
  return amount < 0 ? `-$${formatted}` : `+$${formatted}`
}

const navigateToTransactions = () => {
  logger.navigation('/transactions', 'from_dashboard_transactions_card')
  router.push('/transactions')
}
</script>

<template>
  <div class="transactions-card">
    <div class="card-header">
      <div class="header-left">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <h3>Recent Transactions</h3>
      </div>
      <BaseButton variant="secondary" size="sm" class="view-all-btn" @click="navigateToTransactions">
        View All
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </BaseButton>
    </div>

    <div class="separator"></div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="transactions.length === 0" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13 2 13 9 20 9"/>
      </svg>
      <p>No transactions yet</p>
      <span>Connect accounts to start tracking</span>
    </div>

    <div v-else class="transactions-list">
      <div 
        v-for="transaction in transactions" 
        :key="transaction.id"
        class="transaction-item"
      >
        <div v-if="transaction.logo_url" class="transaction-logo">
          <img :src="transaction.logo_url" :alt="transaction.name" />
        </div>
        <div v-else class="transaction-icon" :style="{ backgroundColor: getCategoryColor(transaction.categoryPrimary || 'Uncategorized') + '20', color: getCategoryColor(transaction.categoryPrimary || 'Uncategorized') }">
          {{ (transaction.name || 'T').charAt(0).toUpperCase() }}
        </div>
        <div class="transaction-info">
          <span class="transaction-name">{{ transaction.name || 'Transaction' }}</span>
          <span class="transaction-category">{{ transaction.categoryPrimary || 'Uncategorized' }}</span>
        </div>
        <div class="transaction-right">
          <span class="transaction-amount" :class="{ 'negative': transaction.amount < 0, 'positive': transaction.amount > 0 }">
            {{ formatAmount(transaction.amount) }}
          </span>
          <span class="transaction-date">{{ formatDate(transaction.date) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transactions-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
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
  margin: 0;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  text-align: center;
}

.error-state {
  color: var(--color-error);
}

.empty-state .empty-icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

.empty-state p {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  margin: 0;
}

.empty-state span {
  font-size: 0.75rem;
  opacity: 0.7;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  background: var(--color-bg-card);
  border-radius: 8px;
  transition: background 0.2s;
}

.transaction-item:hover {
  background: var(--color-bg-hover);
}

.transaction-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 600;
  flex-shrink: 0;
}

.transaction-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  overflow: hidden;
  flex-shrink: 0;
}

.transaction-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.transaction-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.transaction-name {
  color: var(--color-text-primary);
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transaction-category {
  color: var(--color-text-muted);
  font-size: 0.6875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transaction-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
  flex-shrink: 0;
}

.transaction-amount {
  font-size: 0.8125rem;
  font-weight: 600;
}

.transaction-amount.positive {
  color: var(--color-success);
}

.transaction-amount.negative {
  color: var(--color-text-primary);
}

.transaction-date {
  color: var(--color-text-muted);
  font-size: 0.6875rem;
}

.view-all-btn {
  background: var(--color-bg-card) !important;
  color: var(--color-text-secondary) !important;
  border-color: var(--color-border) !important;
}

.view-all-btn:hover {
  background: var(--color-bg-hover) !important;
  color: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
}
</style>
