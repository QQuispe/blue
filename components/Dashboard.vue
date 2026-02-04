<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue'
import BalanceCard from "./cards/BalanceCard.vue";
import BudgetsCard from "./cards/BudgetsCard.vue";
import TopSpendingCategoriesCard from "./cards/TopSpendingCategoriesCard.vue";
import NetWorthCard from "./cards/NetWorthCard.vue";

const balanceCardRef: Ref<any> = ref(null)
const netWorthCardRef: Ref<any> = ref(null)
const spendingCardRef: Ref<any> = ref(null)
const budgetsCardRef: Ref<any> = ref(null)

const { fetchUser } = useAuth()

const refreshAll = (): void => {
  balanceCardRef.value?.refresh()
  netWorthCardRef.value?.refresh()
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
      <!-- Main Content -->
      <div class="main-content">
        <main class="grid-container">
          <!-- Row 1: Net Worth (wide - 2 columns) + Balance -->
          <div class="card card-wide">
            <NetWorthCard ref="netWorthCardRef" />
          </div>
          <div class="card">
            <BalanceCard ref="balanceCardRef" />
          </div>
          
          <!-- Row 2: Spending + Budgets (side by side, each 1 column) -->
          <div class="card">
            <TopSpendingCategoriesCard ref="spendingCardRef" />
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
  min-height: 100vh;
}

.dashboard {
  width: 100%;
}

.main-content {
  width: 100%;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto;
  gap: 16px;
  width: 100%;
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
}

.card:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border-hover);
}

/* Responsive design */
@media (max-width: 1024px) {
  .grid-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
  }
  
  .card-wide {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 8px;
  }
  
  .grid-container {
    gap: 10px;
  }
  
  .card {
    padding: 10px;
  }
}
</style>