<script setup lang="ts">
import { ref, watch, onMounted, type Ref } from 'vue'
import TransactionsTable from '~/components/transactions/TransactionsTable.vue'
import TransactionFilters from '~/components/transactions/TransactionFilters.vue'
import TransactionsSummary from '~/components/transactions/TransactionsSummary.vue'
import TransactionDetail from '~/components/transactions/TransactionDetail.vue'
import BaseButton from '~/components/BaseButton.vue'

definePageMeta({
  middleware: 'auth'
})

interface Transaction {
  id: number
  date: string
  name: string
  amount: number
  category: string | null
  categoryPrimary: string | null
  logo_url: string | null
  account_id: number
  account_name: string
  account_type: string
  pending: boolean
}

const transactions: Ref<Transaction[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)

// Filters
const search: Ref<string> = ref('')
const selectedAccount: Ref<string | null> = ref(null)
const datePreset: Ref<string> = ref('30d')
const sortBy: Ref<string> = ref('date-desc')

// Pagination
const currentPage: Ref<number> = ref(1)
const pageSize: Ref<number> = ref(10)
const totalCount: Ref<number> = ref(0)

// Summary
const totalSpend: Ref<number> = ref(0)
const accounts: Ref<{ id: number; name: string }[]> = ref([])

// Detail panel
const selectedTransaction: Ref<Transaction | null> = ref(null)
const showDetail: Ref<boolean> = ref(false)

let fetchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchTransactions = async (params: URLSearchParams) => {
  const response = await fetch(`/api/user/transactions?${params}`, { credentials: 'include' })
  if (!response.ok) throw new Error('Failed to fetch transactions')
  const data = await response.json()
  return data
}

const fetchSummary = async (params: URLSearchParams) => {
  const response = await fetch(`/api/user/transactions/summary?${params}`, { credentials: 'include' })
  if (response.ok) {
    const data = await response.json()
    return data.totalSpend || 0
  }
  return null
}

const fetchData = async (showLoading = true) => {
  if (fetchTimeout) {
    clearTimeout(fetchTimeout)
  }

  fetchTimeout = setTimeout(async () => {
    if (showLoading) {
      isLoading.value = true
    }
    error.value = null

    try {
      const params = new URLSearchParams({
        page: currentPage.value.toString(),
        limit: pageSize.value.toString(),
        sort: sortBy.value
      })

      if (search.value) params.append('search', search.value)
      if (selectedAccount.value) params.append('accountId', selectedAccount.value)
      params.append('datePreset', datePreset.value)

      const [transactionsData, summaryData] = await Promise.all([
        fetchTransactions(params),
        fetchSummary(params)
      ])

      transactions.value = transactionsData.transactions || []
      totalCount.value = transactionsData.count || 0
      if (summaryData !== null) {
        totalSpend.value = summaryData
      }

      if (showLoading && accounts.value.length === 0) {
        const filtersRes = await fetch('/api/user/transactions/filters', { credentials: 'include' })
        if (filtersRes.ok) {
          const filtersData = await filtersRes.json()
          accounts.value = filtersData.accounts || []
        }
      }
    } catch (err) {
      if (showLoading) {
        error.value = err instanceof Error ? err.message : 'Unknown error'
      }
    } finally {
      isLoading.value = false
      fetchTimeout = null
    }
  }, showLoading ? 0 : 150)
}

onMounted(() => {
  fetchData(true)
})

watch([search, selectedAccount, datePreset, sortBy], () => {
  currentPage.value = 1
  fetchData(false)
}, { deep: true })

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchData(false)
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  fetchData(false)
}

const handleSort = (field: string) => {
  const currentField = sortBy.value.split('-')[0]
  const currentDirection = sortBy.value.split('-')[1] || 'desc'
  
  if (currentField === field) {
    sortBy.value = `${field}-${currentDirection === 'asc' ? 'desc' : 'asc'}`
  } else {
    sortBy.value = `${field}-desc`
  }
}

const handleTransactionClick = (transaction: Transaction) => {
  selectedTransaction.value = transaction
  showDetail.value = true
}

const handleDetailClose = () => {
  showDetail.value = false
  selectedTransaction.value = null
}
</script>

<template>
  <div class="transactions-page">
    <div class="page-header">
      <h1>Transactions</h1>
      <BaseButton variant="secondary" size="sm" to="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </BaseButton>
    </div>

    <div class="summary-filters-row">
      <TransactionFilters
        v-model:search="search"
        v-model:account="selectedAccount"
        v-model:date-preset="datePreset"
        v-model:sort="sortBy"
        :accounts="accounts"
      />

      <TransactionsSummary
        :total-count="totalCount"
        :total-spend="totalSpend"
      />
    </div>

    <TransactionsTable
      :transactions="transactions"
      :loading="isLoading"
      :error="error"
      :page="currentPage"
      :page-size="pageSize"
      :total="totalCount"
      :sort-by="sortBy"
      @transaction-click="handleTransactionClick"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
      @refresh="fetchData"
      @sort="handleSort"
    />

    <TransactionDetail
      v-if="showDetail && selectedTransaction"
      :transaction="selectedTransaction"
      @close="handleDetailClose"
    />
  </div>
</template>

<style scoped>
.transactions-page {
  padding: 16px;
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.page-header h1 {
  color: var(--color-text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.summary-filters-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.summary-filters-row > :first-child {
  flex: 2;
}

.summary-filters-row > :last-child {
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .summary-filters-row {
    flex-direction: row;
    align-items: stretch;
  }
}
</style>
