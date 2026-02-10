<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import { getLogger } from '~/utils/logger'
const logger = getLogger()
import { getCategoryColor, formatCurrency, formatDate } from '~/utils/formatters'
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

const navigateToTransactions = () => {
  logger.navigation('/transactions', 'from_dashboard_transactions_card')
  router.push('/transactions')
}
</script>

<template>
  <div class="transactions-card">
    <div class="card-header">
      <div class="header-left">
        <Icon name="mdi:view-list" size="18" />
        <h3>Recent Transactions</h3>
      </div>
      <BaseButton variant="secondary" size="sm" class="view-all-btn" @click="navigateToTransactions">
        View All
        <Icon name="mdi:chevron-right" size="16" />
      </BaseButton>
    </div>

    <div class="separator"></div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <Icon name="mdi:alert-circle" size="18" />
      <span>{{ error }}</span>
    </div>

    <div v-else-if="transactions.length === 0" class="empty-state">
      <Icon name="mdi:view-list" size="24" />
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
  background: var(--color-bg-elevated);
  border-radius: 8px;
  transition: all 0.2s;
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
  background: var(--color-bg-elevated);
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
  background: var(--color-bg-elevated) !important;
  color: var(--color-text-secondary) !important;
  border: none !important;
}

.view-all-btn:hover {
  background: var(--color-bg-card-hover) !important;
  color: var(--color-accent) !important;
}
</style>
