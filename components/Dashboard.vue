<script setup>
import { ref } from 'vue'
import BalanceCard from "./cards/BalanceCard.vue";
import BudgetsCard from "./cards/BudgetsCard.vue";
import TopSpendingCategoriesCard from "./cards/TopSpendingCategoriesCard.vue";
import NetWorthCard from "./cards/NetWorthCard.vue";

// Refs to card components
const balanceCardRef = ref(null)
const netWorthCardRef = ref(null)
const spendingCardRef = ref(null)
const budgetsCardRef = ref(null)

// Refresh all cards
const refreshAll = () => {
  balanceCardRef.value?.refresh()
  netWorthCardRef.value?.refresh()
  spendingCardRef.value?.refresh()
  budgetsCardRef.value?.refresh()
}

defineExpose({ refreshAll })
</script>
<template>
  <div class="page-container">
    <div class="dashboard">
      <!-- Main Content -->
      <div class="main-content">
        <main class="grid-container">
          <!-- Row 1: Net Worth (wide) + Balance -->
          <div class="card card-wide">
            <NetWorthCard ref="netWorthCardRef" />
          </div>
          <div class="card">
            <BalanceCard ref="balanceCardRef" />
          </div>
          
          <!-- Row 2: Spending + Budgets -->
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
  display: flex;
  flex-direction: column;
  padding-top: 10px;
}

/* Layout */
.dashboard {
  display: flex;
}

@media (min-width: 768px) {
  .sidebar {
    display: block;
  }
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Grid Layout - 3 columns with Net Worth spanning 2 */
.grid-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 10px 20px 20px 20px;
}

@media (min-width: 768px) {
  .grid-container {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .card-wide {
    grid-column: span 2;
  }
}

@media (min-width: 1024px) {
  .grid-container {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .card-wide {
    grid-column: span 2;
  }
}

/* Card Style - consistent height across all cards */
.card {
  background: #151515;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  height: 300px;
}

.card-wide {
  height: 300px;
}
</style>
