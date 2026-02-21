<script setup lang="ts">
import { ref, watch, onMounted, type Ref } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import TransactionsTable from '~/components/finance/TransactionsTable.vue'
import TransactionFilters from '~/components/finance/TransactionFilters.vue'
import TransactionsSummary from '~/components/finance/TransactionsSummary.vue'
import TransactionDetail from '~/components/finance/TransactionDetail.vue'

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
  const response = await fetch(`/api/finance/transactions?${params}`, { credentials: 'include' })
  if (!response.ok) throw new Error('Failed to fetch transactions')
  const data = await response.json()
  return data
}

const fetchSummary = async (params: URLSearchParams) => {
  const response = await fetch(`/api/finance/transactions/summary?${params}`, {
    credentials: 'include',
  })
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

  fetchTimeout = setTimeout(
    async () => {
      if (showLoading) {
        isLoading.value = true
      }
      error.value = null

      try {
        const params = new URLSearchParams({
          page: currentPage.value.toString(),
          limit: pageSize.value.toString(),
          sort: sortBy.value,
        })

        if (search.value) params.append('search', search.value)
        if (selectedAccount.value) params.append('accountId', selectedAccount.value)
        params.append('datePreset', datePreset.value)

        const [transactionsData, summaryData] = await Promise.all([
          fetchTransactions(params),
          fetchSummary(params),
        ])

        transactions.value = transactionsData.transactions || []
        totalCount.value = transactionsData.count || 0
        if (summaryData !== null) {
          totalSpend.value = summaryData
        }

        if (showLoading && accounts.value.length === 0) {
          const filtersRes = await fetch('/api/finance/transactions/filters', {
            credentials: 'include',
          })
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
    },
    showLoading ? 0 : 150
  )
}

onMounted(() => {
  fetchData(true)
})

watch(
  [search, selectedAccount, datePreset, sortBy],
  () => {
    currentPage.value = 1
    fetchData(false)
  },
  { deep: true }
)

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
  <PageLayout title="Transactions">
    <div class="summary-filters-row">
      <TransactionFilters
        v-model:search="search"
        v-model:account="selectedAccount"
        v-model:date-preset="datePreset"
        v-model:sort="sortBy"
        :accounts="accounts"
      />

      <TransactionsSummary :total-count="totalCount" :total-spend="totalSpend" />
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
  </PageLayout>
</template>

<style scoped>
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
