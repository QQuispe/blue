<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue'
import BalanceCard from "./cards/BalanceCard.vue";
import BudgetsCard from "./cards/BudgetsCard.vue";
import TransactionsCard from "./cards/TransactionsCard.vue";
import TopSpendingCategoriesCard from "./cards/TopSpendingCategoriesCard.vue";
import NetWorthCard from "./cards/NetWorthCard.vue";

const balanceCardRef: Ref<any> = ref(null)
const netWorthCardRef: Ref<any> = ref(null)
const transactionsCardRef: Ref<any> = ref(null)
const spendingCardRef: Ref<any> = ref(null)
const budgetsCardRef: Ref<any> = ref(null)

const { fetchUser } = useAuth()

const refreshAll = (): void => {
  balanceCardRef.value?.refresh()
  netWorthCardRef.value?.refresh()
  transactionsCardRef.value?.refresh()
  spendingCardRef.value?.refresh()
  budgetsCardRef.value?.refresh()
}

onMounted(async () => {
  await fetchUser()
  refreshAll()
})
</script>
<template>
  <div class="page-container">
    <div class="dashboard">
      <div class="main-content">
        <main class="grid-container">
          <div class="card card-wide">
            <NetWorthCard ref="netWorthCardRef" />
          </div>
          <div class="card">
            <BalanceCard ref="balanceCardRef" />
          </div>
          
          <div class="card">
            <TopSpendingCategoriesCard ref="spendingCardRef" />
          </div>
          <div class="card">
            <TransactionsCard ref="transactionsCardRef" />
          </div>
          <div class="card">
            <BudgetsCard ref="budgetsCardRef" />
          </div>
        </main>
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
  grid-template-rows: 1fr 1fr;
  gap: 16px;
  width: 100%;
  flex: 1;
}

.card-wide {
  grid-column: span 2;
}

.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.card:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border-hover);
}

@media (max-width: 1024px) {
  .grid-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    flex: none;
  }
  
  .card-wide {
    grid-column: span 1;
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