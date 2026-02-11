<script setup lang="ts">
import { ref, onMounted, nextTick, type Ref } from 'vue'
import OverviewCard from "./cards/OverviewCard.vue";
import BudgetProgressCard from "./cards/BudgetProgressCard.vue";
import TransactionsCard from "./cards/TransactionsCard.vue";
import NetWorthCard from "./cards/NetWorthCard.vue";
import BillsCard from "./cards/BillsCard.vue";

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
  if (typeof budgetProgressCardRef.value?.refresh === 'function') budgetProgressCardRef.value.refresh()
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
          <div class="card card-wide">
            <NetWorthCard ref="netWorthCardRef" />
          </div>
          <div class="card">
            <OverviewCard ref="overviewCardRef" />
          </div>
          
          <div class="bottom-row">
            <div class="card">
              <BudgetProgressCard ref="budgetProgressCardRef" />
            </div>
            <div class="card">
              <TransactionsCard ref="transactionsCardRef" />
            </div>
            <div class="card">
              <BillsCard ref="billsCardRef" />
            </div>
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
  gap: 16px;
  width: 100%;
  flex: 1;
  align-items: stretch;
}

.bottom-row {
  grid-column: span 3;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.card-wide {
  grid-column: span 2;
  height: 100%;
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

@media (max-width: 1024px) {
  .grid-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  
  .card-wide {
    grid-column: span 1;
  }
  
  .bottom-row {
    grid-column: span 1;
    grid-template-columns: 1fr;
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
