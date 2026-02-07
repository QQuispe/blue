<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import { getCategoryColor } from '~/composables/useCategoryColors'
import BaseButton from '~/components/BaseButton.vue'

interface Transaction {
  id: number
  date: string
  name: string
  amount: number
  category: string | null
  categoryPrimary: string | null
  account_id: number
  account_name: string
  account_type: string
  pending: boolean
  logo_url: string | null
}

const props = defineProps<{
  transactions: Transaction[]
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  sortBy: string
}>()

const emit = defineEmits<{
  (e: 'transaction-click', transaction: Transaction): void
  (e: 'page-change', page: number): void
  (e: 'page-size-change', size: number): void
  (e: 'refresh'): void
  (e: 'sort', field: string): void
}>()

const sortableColumns = [
  { key: 'date', label: 'Date' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'account', label: 'Account' },
  { key: 'amount', label: 'Amount' },
]

const currentSortField = computed(() => props.sortBy.split('-')[0])
const currentSortDirection = computed(() => props.sortBy.split('-')[1] || 'desc')

const handleSort = (field: string) => {
  emit('sort', field)
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatAmount = (amount: number): string => {
  const formatted = Math.abs(amount).toFixed(2)
  return amount < 0 ? `-$${formatted}` : `+$${formatted}`
}

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

const pageSizeOptions = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
]

const handleRowClick = (transaction: Transaction) => {
  emit('transaction-click', transaction)
}

const handlePageChange = (newPage: number) => {
  if (newPage >= 1 && newPage <= totalPages.value) {
    emit('page-change', newPage)
  }
}

const handlePageSizeChange = (e: Event) => {
  const size = parseInt((e.target as HTMLSelectElement).value)
  emit('page-size-change', size)
}
</script>

<template>
  <div class="transactions-table-card">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading transactions...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ error }}</span>
      <BaseButton variant="primary" size="sm" @click="$emit('refresh')">
        Retry
      </BaseButton>
    </div>

    <div v-else-if="transactions.length === 0" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13 2 13 9 20 9"/>
      </svg>
      <p>No transactions found</p>
      <span>Try adjusting your filters</span>
    </div>

    <div v-else class="table-container">
      <table class="transactions-table">
        <thead>
          <tr>
            <th 
              v-for="col in sortableColumns" 
              :key="col.key"
              :class="['col-' + col.key, { 'sortable': true, 'active': currentSortField === col.key }]"
              @click="handleSort(col.key)"
            >
              {{ col.label }}
              <span class="sort-icon" v-if="currentSortField === col.key">
                <svg v-if="currentSortDirection === 'asc'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 15l-6-6-6 6"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="transaction in transactions" 
            :key="transaction.id"
            class="transaction-row"
            :class="{ 'pending': transaction.pending }"
            @click="handleRowClick(transaction)"
          >
            <td class="col-date">
              <span class="date">{{ formatDate(transaction.date) }}</span>
              <span v-if="transaction.pending" class="pending-badge">Pending</span>
            </td>
            <td class="col-name">
              <div class="name-cell">
                <div v-if="transaction.logo_url" class="transaction-logo">
                  <img :src="transaction.logo_url" :alt="transaction.name" />
                </div>
                <div v-else class="transaction-icon" :style="{ backgroundColor: getCategoryColor(transaction.categoryPrimary || 'Uncategorized') + '20', color: getCategoryColor(transaction.categoryPrimary || 'Uncategorized') }">
                  {{ (transaction.name || 'T').charAt(0).toUpperCase() }}
                </div>
                <span class="name" :title="transaction.name">{{ transaction.name }}</span>
              </div>
            </td>
            <td class="col-category">
              <span 
                class="category-badge"
                :style="{ backgroundColor: getCategoryColor(transaction.categoryPrimary || 'Uncategorized') }"
              >
                {{ transaction.categoryPrimary || 'Uncategorized' }}
              </span>
            </td>
            <td class="col-account">
              <span class="account-name" :title="transaction.account_name">{{ transaction.account_name }}</span>
            </td>
            <td class="col-amount">
              <span class="amount" :class="{ 'negative': transaction.amount < 0, 'positive': transaction.amount > 0 }">
                {{ formatAmount(transaction.amount) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages >= 1" class="pagination">
        <div class="page-size-select">
          <select :value="props.pageSize" @change="handlePageSizeChange" class="size-select">
            <option v-for="option in pageSizeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <span class="per-page-label">per page</span>
        </div>

        <button
          class="page-btn"
          :disabled="page === 1"
          @click="handlePageChange(page - 1)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        
        <span class="page-info">
          {{ page }} / {{ totalPages }}
        </span>
        
        <button
          class="page-btn"
          :disabled="page === totalPages"
          @click="handlePageChange(page + 1)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transactions-table-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}


.error-state svg, .empty-state svg {
  opacity: 0.5;
}

.table-container {
  width: 100%;
  overflow-x: auto;
}

.transactions-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.transactions-table th,
.transactions-table td {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transactions-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
}

.transactions-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  white-space: nowrap;
}

.transactions-table th.sortable:hover {
  color: var(--color-text-primary);
}

.transactions-table th.active {
  color: var(--color-accent);
}

.sort-icon {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  flex-shrink: 0;
}

.transactions-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.transaction-row {
  cursor: pointer;
  transition: background 0.15s;
}

.transaction-row:hover {
  background: var(--color-bg-hover);
}

.transaction-row:last-child td {
  border-bottom: none;
}

.transaction-row.pending {
  opacity: 0.6;
}

.col-date { 
  width: 90px; 
  max-width: 90px;
}
.col-name { 
  width: 1fr; 
  min-width: 150px;
}
.col-category { 
  width: max-content;
  min-width: 110px;
}
.col-account { 
  width: max-content;
  min-width: 120px;
}
.col-amount { 
  width: 120px;
  max-width: 120px;
  text-align: right;
  overflow: visible;
  text-overflow: unset;
  white-space: nowrap;
}

.col-amount .amount {
  white-space: nowrap;
}

.date {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.pending-badge {
  display: inline-block;
  font-size: 0.625rem;
  padding: 2px 6px;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border-radius: 4px;
  margin-left: 6px;
  text-transform: uppercase;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
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

.name {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  min-width: 90px;
  text-align: center;
}

.account-name {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 130px;
}

.amount {
  font-size: 0.875rem;
  font-weight: 600;
}

.amount.positive {
  color: var(--color-success);
}

.amount.negative {
  color: var(--color-text-primary);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
}

.page-size-select {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
}

.size-select {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--color-text-primary);
  font-size: 0.8125rem;
  cursor: pointer;
}

.size-select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.per-page-label {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
</style>
