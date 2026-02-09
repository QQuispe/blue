<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue'
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
  overviewCardRef.value?.refresh()
  netWorthCardRef.value?.refresh()
  transactionsCardRef.value?.refresh()
  budgetProgressCardRef.value?.refresh()
  billsCardRef.value?.refresh()
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
        <div class="grid-container">
          <div class="card card-wide">
            <NetWorthCard ref="netWorthCardRef" />
          </div>
          <div class="card">
            <OverviewCard ref="overviewCardRef" />
          </div>
          
          <div class="card-row">
            <div class="carousel-container">
              <div class="carousel-card">
                <BudgetProgressCard ref="budgetProgressCardRef" />
              </div>
              <div class="carousel-card">
                <TransactionsCard ref="transactionsCardRef" />
              </div>
              <div class="carousel-card">
                <BillsCard ref="billsCardRef" />
              </div>
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
  grid-template-rows: auto auto;
  gap: 16px;
  width: 100%;
  flex: 1;
}

.card-row {
  grid-column: span 3;
  display: flex;
  flex-direction: column;
}

.carousel-container {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.carousel-container::-webkit-scrollbar {
  display: none;
}

.carousel-card {
  flex: 0 0 calc(33.333% - 11px);
  min-width: 280px;
  scroll-snap-align: start;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.3s ease;
}

.carousel-card:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border-hover);
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
  }
  
  .card-wide {
    grid-column: span 1;
  }
  
  .card-row {
    grid-column: span 1;
  }
  
  .carousel-card {
    flex: 0 0 100%;
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
  
  .carousel-card {
    padding: 10px;
  }
}
</style>