<script setup lang="ts">
import { ref, onMounted, nextTick, type Ref } from 'vue'
import OverviewCard from '~/components/cards/OverviewCard.vue'
import BudgetProgressCard from '~/components/cards/BudgetProgressCard.vue'
import TransactionsCard from '~/components/cards/TransactionsCard.vue'
import NetWorthCard from '~/components/cards/NetWorthCard.vue'
import BillsCard from '~/components/cards/BillsCard.vue'

const overviewCardRef: Ref<any> = ref(null)
const netWorthCardRef: Ref<any> = ref(null)
const transactionsCardRef: Ref<any> = ref(null)
const budgetProgressCardRef: Ref<any> = ref(null)
const billsCardRef: Ref<any> = ref(null)

const { fetchUser } = useAuth()

const refreshAll = (): void => {
  if (typeof overviewCardRef.value?.refresh === 'function') overviewCardRef.value.refresh()
  if (typeof netWorthCardRef.value?.refresh === 'function') netWorthCardRef.value.refresh()
  if (typeof transactionsCardRef.value?.refresh === 'function') transactionsCardRef.value.refresh()
  if (typeof budgetProgressCardRef.value?.refresh === 'function')
    budgetProgressCardRef.value.refresh()
  if (typeof billsCardRef.value?.refresh === 'function') billsCardRef.value.refresh()
}

onMounted(async () => {
  await fetchUser()
  await nextTick()
  refreshAll()
})
</script>

<template>
  <div class="page-container">
    <div class="dashboard">
      <div class="main-content">
        <div class="grid-container">
          <div class="card networth-card">
            <NetWorthCard ref="netWorthCardRef" />
          </div>
          <div class="card overview-card">
            <OverviewCard ref="overviewCardRef" />
          </div>
          <div class="card budget-card">
            <BudgetProgressCard ref="budgetProgressCardRef" />
          </div>
          <div class="card transactions-card">
            <TransactionsCard ref="transactionsCardRef" />
          </div>
          <div class="card bills-card">
            <BillsCard ref="billsCardRef" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 16px;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.dashboard {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-content {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 362px auto;
  grid-template-areas:
    'networth networth overview'
    'budget transactions bills';
  gap: 16px;
  width: 100%;
  flex: 1;
  align-items: stretch;
}

.networth-card {
  grid-area: networth;
  height: 100%;
}

.overview-card {
  grid-area: overview;
  height: 100%;
}

.budget-card {
  grid-area: budget;
}

.transactions-card {
  grid-area: transactions;
}

.bills-card {
  grid-area: bills;
}

.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border-hover);
}

@media (min-width: 901px) and (max-width: 1399px) {
  .grid-container {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: 400px repeat(2, 1fr);
    grid-template-areas:
      'networth networth'
      'overview budget'
      'transactions bills';
  }

  .networth-card {
    height: 400px;
  }
}

@media (max-width: 900px) {
  .grid-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    grid-template-areas:
      'networth'
      'overview'
      'budget'
      'transactions'
      'bills';
  }

  .networth-card {
    height: auto;
    min-height: 300px;
  }

  .overview-card {
    height: auto;
    min-height: 250px;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 8px;
    min-height: calc(100vh - 50px);
  }

  .grid-container {
    gap: 10px;
  }

  .card {
    padding: 10px;
  }
}
</style>
