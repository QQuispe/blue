<script setup lang="ts">
import { useMobile } from '~/composables/ui/useMobile'
import { useRoute } from 'vue-router'

const { isMobile, openMobileMenu, closeMobileMenu } = useMobile()
const route = useRoute()

// Define navigation items with their submenus
const navItems = [
  {
    id: 'finance' as const,
    label: 'Finance',
    icon: 'mdi:finance',
    submenu: [
      { name: 'Dashboard', path: '/finance', icon: 'mdi:view-dashboard' },
      { name: 'Accounts', path: '/finance/accounts', icon: 'mdi:bank' },
      { name: 'Transactions', path: '/finance/transactions', icon: 'mdi:view-list' },
      { name: 'Budgets', path: '/finance/budgets', icon: 'mdi:chart-pie' },
    ],
  },
  {
    id: 'health' as const,
    label: 'Health',
    icon: 'mdi:heart-pulse',
    submenu: [
      { name: 'Dashboard', path: '/health', icon: 'mdi:view-dashboard' },
      { name: 'Meals', path: '/health/meals', icon: 'mdi:food' },
      { name: 'Foods', path: '/health/foods', icon: 'mdi:food-apple' },
      { name: 'Plans', path: '/health/plan', icon: 'mdi:dumbbell' },
      { name: 'Check-ins', path: '/health/checkins', icon: 'mdi:scale' },
    ],
  },
  {
    id: 'settings' as const,
    label: 'Settings',
    icon: 'mdi:cog',
    path: '/settings', // Settings goes directly to page
  },
]

const isActive = (item: (typeof navItems)[0]) => {
  const currentPath = route.path
  // Check if current path starts with the section path
  if (item.id === 'finance' && currentPath.startsWith('/finance')) return true
  if (item.id === 'health' && currentPath.startsWith('/health')) return true
  if (item.id === 'settings' && currentPath === '/settings') return true
  return false
}

const handleNavClick = (item: (typeof navItems)[0]) => {
  if (item.path) {
    // Close any open menu first, then navigate
    closeMobileMenu()
    navigateTo(item.path)
  } else if (item.submenu) {
    openMobileMenu(item.id)
  }
}
</script>

<template>
  <nav v-if="isMobile" class="bottom-nav">
    <button
      v-for="item in navItems"
      :key="item.id"
      class="nav-item"
      :class="{ active: isActive(item) }"
      @click="handleNavClick(item)"
    >
      <Icon :name="item.icon" size="24" />
      <span class="nav-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 16px;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.2s ease;
  flex: 1;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
}

/* Safe area padding for iPhone X+ */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav {
    padding-bottom: env(safe-area-inset-bottom);
    height: calc(64px + env(safe-area-inset-bottom));
  }
}
</style>
