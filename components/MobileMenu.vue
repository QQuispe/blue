<script setup lang="ts">
import { useMobile } from '~/composables/ui/useMobile'
import { computed } from 'vue'

const { isMobileMenuOpen, activeMenu, closeMobileMenu } = useMobile()

// Define submenu content based on active menu
const menuContent = computed(() => {
  switch (activeMenu.value) {
    case 'finance':
      return {
        title: 'Finance',
        items: [
          { name: 'Dashboard', path: '/finance', icon: 'mdi:view-dashboard' },
          { name: 'Accounts', path: '/finance/accounts', icon: 'mdi:bank' },
          { name: 'Transactions', path: '/finance/transactions', icon: 'mdi:view-list' },
          { name: 'Budgets', path: '/finance/budgets', icon: 'mdi:chart-pie' },
        ],
      }
    case 'health':
      return {
        title: 'Health',
        items: [
          { name: 'Dashboard', path: '/health', icon: 'mdi:view-dashboard' },
          { name: 'Meals', path: '/health/meals', icon: 'mdi:food' },
          { name: 'Foods', path: '/health/foods', icon: 'mdi:food-apple' },
          { name: 'Plans', path: '/health/plan', icon: 'mdi:dumbbell' },
          { name: 'Check-ins', path: '/health/checkins', icon: 'mdi:scale' },
        ],
      }
    default:
      return null
  }
})

const handleItemClick = (path: string) => {
  navigateTo(path)
  closeMobileMenu()
}

const handleBackdropClick = () => {
  closeMobileMenu()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div
        v-if="isMobileMenuOpen && menuContent"
        class="mobile-menu-overlay"
        @click="handleBackdropClick"
      >
        <div class="mobile-menu" @click.stop>
          <div class="menu-header">
            <h2 class="menu-title">{{ menuContent.title }}</h2>
            <button class="close-btn" @click="closeMobileMenu">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <div class="menu-grid">
            <button
              v-for="item in menuContent.items"
              :key="item.path"
              class="menu-item"
              @click="handleItemClick(item.path)"
            >
              <div class="menu-icon">
                <Icon :name="item.icon" size="32" />
              </div>
              <span class="menu-label">{{ item.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 64px; /* Leave space for bottom nav */
  background: rgba(0, 0, 0, 0.5);
  z-index: 150; /* Below bottom nav (z-index: 100) */
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: auto;
}

.mobile-menu {
  background: var(--color-bg-card);
  width: 100%;
  max-height: calc(70vh - 64px); /* Account for bottom nav */
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: 20px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
}

/* Ensure bottom nav stays on top */
:global(.bottom-nav) {
  z-index: 200 !important;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.menu-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.close-btn:active {
  background: var(--color-bg-hover);
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 16px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item:active {
  transform: scale(0.98);
  background: var(--color-bg-hover);
}

.menu-icon {
  color: var(--color-primary);
}

.menu-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

/* Slide-up animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}

.slide-up-enter-from .mobile-menu,
.slide-up-leave-to .mobile-menu {
  transform: translateY(100%);
}

.slide-up-enter-to .mobile-menu,
.slide-up-leave-from .mobile-menu {
  transform: translateY(0);
}
</style>
