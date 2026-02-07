<script setup lang="ts">
import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import BalanceCard from "./cards/BalanceCard.vue";
import BudgetsCard from "./cards/BudgetsCard.vue";
import TransactionsCard from "./cards/TransactionsCard.vue";
import TopSpendingCategoriesCard from "./cards/TopSpendingCategoriesCard.vue";
import NetWorthCard from "./cards/NetWorthCard.vue";
import CashFlowCard from "./cards/CashFlowCard.vue";

const balanceCardRef: Ref<any> = ref(null)
const netWorthCardRef: Ref<any> = ref(null)
const transactionsCardRef: Ref<any> = ref(null)
const spendingCardRef: Ref<any> = ref(null)
const budgetsCardRef: Ref<any> = ref(null)
const cashFlowCardRef: Ref<any> = ref(null)

const activeDot = ref(0)
const carouselContainer: Ref<HTMLElement | null> = ref(null)

const { fetchUser } = useAuth()

const refreshAll = (): void => {
  balanceCardRef.value?.refresh()
  netWorthCardRef.value?.refresh()
  transactionsCardRef.value?.refresh()
  spendingCardRef.value?.refresh()
  budgetsCardRef.value?.refresh()
  cashFlowCardRef.value?.refresh()
}

const scrollToCard = (index: number) => {
  activeDot.value = index
  const cards = carouselContainer.value?.querySelectorAll('.carousel-card')
  cards?.[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
}

const handleCarouselScroll = () => {
  const container = carouselContainer.value
  if (!container) return
  
  const cards = container.querySelectorAll('.carousel-card')
  const scrollLeft = container.scrollLeft
  const cardWidth = cards[0]?.clientWidth || 0
  const gap = 16
  const index = Math.round(scrollLeft / (cardWidth + gap))
  activeDot.value = Math.min(index, cards.length - 1)
}

onMounted(async () => {
  await fetchUser()
  refreshAll()
  
  const container = carouselContainer.value
  if (container) {
    container.addEventListener('scroll', handleCarouselScroll)
  }
})

onUnmounted(() => {
  const container = carouselContainer.value
  if (container) {
    container.removeEventListener('scroll', handleCarouselScroll)
  }
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
            <BalanceCard ref="balanceCardRef" />
          </div>
          
          <div class="card-row">
            <div class="carousel-container" ref="carouselContainer">
              <div class="carousel-card">
                <TopSpendingCategoriesCard ref="spendingCardRef" />
              </div>
              <div class="carousel-card">
                <TransactionsCard ref="transactionsCardRef" />
              </div>
              <div class="carousel-card">
                <CashFlowCard ref="cashFlowCardRef" />
              </div>
            </div>
            <div class="carousel-dots">
              <button 
                v-for="(_, index) in 3" 
                :key="index"
                class="dot" 
                :class="{ active: activeDot === index }"
                @click="scrollToCard(index)"
                :aria-label="'Go to card ' + (index + 1)"
              ></button>
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

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot.active {
  background: var(--color-primary);
  transform: scale(1.2);
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