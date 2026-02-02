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
          <div class="card">
            <BalanceCard ref="balanceCardRef" />
          </div>
          <div class="card">
            <NetWorthCard ref="netWorthCardRef" />
          </div>
          <div class="card">
            <TopSpendingCategoriesCard ref="spendingCardRef" />
          </div>
          <div class="card">
            <BudgetsCard ref="budgetsCardRef" />
          </div>
          <div class="card">Section 5</div>
          <div class="card">Section 6</div>
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

/* Grid Layout */
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
}

@media (min-width: 1024px) {
  .grid-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Card Style */
.card {
  background: #151515;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
