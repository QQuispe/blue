<script setup lang="ts">
import { ref, computed } from 'vue'

interface MenuItem {
  name: string
  icon: string
  path: string
}

interface NavGroup {
  name: string
  icon: string
  items?: MenuItem[]
  path?: string
}

const auth = useAuth()
const username = computed((): string => auth.user.value?.username || 'User')
const { isCollapsed, toggle } = useSidebar()

const financeExpanded = ref(true)
const financeTempExpanded = ref(false)
const healthExpanded = ref(true)
const healthTempExpanded = ref(false)

const showFinanceItems = computed(() => {
  if (isCollapsed.value) {
    return financeTempExpanded.value
  }
  return financeExpanded.value
})

const showHealthItems = computed(() => {
  if (isCollapsed.value) {
    return healthTempExpanded.value
  }
  return healthExpanded.value
})

const toggleFinance = () => {
  if (isCollapsed.value) {
    healthTempExpanded.value = false
    financeTempExpanded.value = !financeTempExpanded.value
  } else {
    financeExpanded.value = !financeExpanded.value
  }
}

const toggleHealth = () => {
  if (isCollapsed.value) {
    financeTempExpanded.value = false
    healthTempExpanded.value = !healthTempExpanded.value
  } else {
    healthExpanded.value = !healthExpanded.value
  }
}

const closeTempExpand = () => {
  financeTempExpanded.value = false
  healthTempExpanded.value = false
}

const navGroups: NavGroup[] = [
  {
    name: 'Finance',
    icon: 'mdi:finance',
    path: '/finance',
    items: [
      { name: 'Accounts', icon: 'mdi:bank', path: '/finance/accounts' },
      { name: 'Transactions', icon: 'mdi:view-list', path: '/finance/transactions' },
      { name: 'Budgets', icon: 'mdi:chart-pie', path: '/finance/budgets' },
    ],
  },
  {
    name: 'Health',
    icon: 'mdi:heart-pulse',
    path: '/health',
    items: [
      { name: 'Meals', icon: 'mdi:food', path: '/health/meals' },
      { name: 'Plans', icon: 'mdi:dumbbell', path: '/health/plan' },
      { name: 'Check-ins', icon: 'mdi:scale', path: '/health/checkins' },
    ],
  },
]

const isActiveGroup = (group: NavGroup) => {
  const currentPath = window?.location?.pathname || ''
  if (group.path && currentPath === group.path) return true
  if (group.items) {
    return group.items.some(item => currentPath === item.path)
  }
  return false
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <button class="toggle-btn" @click="toggle" :title="isCollapsed ? 'Expand' : 'Collapse'">
      <Icon v-if="!isCollapsed" name="mdi:chevron-left" size="20" />
      <Icon v-else name="mdi:chevron-right" size="20" />
    </button>

    <ClientOnly>
      <div class="user-section" v-if="auth.isAuthenticated && auth.user">
        <div class="user-avatar">
          {{ username.charAt(0).toUpperCase() }}
        </div>
        <div class="user-info" v-show="!isCollapsed">
          <span class="user-name">{{ username }}</span>
          <span class="user-role">User</span>
        </div>
      </div>
      <template #fallback>
        <div class="user-section">
          <div class="user-avatar">U</div>
          <div class="user-info" v-show="!isCollapsed">
            <span class="user-name">User</span>
            <span class="user-role">User</span>
          </div>
        </div>
      </template>
    </ClientOnly>

    <nav class="nav-menu" @click="closeTempExpand">
      <!-- Finance Group -->
      <div class="nav-group" @click.stop>
        <NuxtLink
          :to="navGroups[0].path"
          class="nav-group-header"
          :class="{ active: isActiveGroup(navGroups[0]) }"
        >
          <Icon :name="navGroups[0].icon" size="20" class="nav-icon" />
          <span class="nav-text" v-show="!isCollapsed">{{ navGroups[0].name }}</span>
          <button v-if="!isCollapsed" class="expand-btn" @click.prevent="toggleFinance">
            <Icon name="mdi:chevron-down" size="18" :class="{ rotated: financeExpanded }" />
          </button>
        </NuxtLink>

        <div
          class="nav-group-items"
          :class="{ 'temp-expanded': isCollapsed && financeTempExpanded }"
          v-show="showFinanceItems"
        >
          <NuxtLink
            v-for="item in navGroups[0].items"
            :key="item.path"
            :to="item.path"
            class="nav-item sub-item"
            :class="{ active: $route.path === item.path }"
            @click="isCollapsed && (financeTempExpanded = false)"
          >
            <Icon v-if="isCollapsed" :name="item.icon" size="18" class="nav-icon" />
            <span class="nav-text">{{ item.name }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Health Group -->
      <div class="nav-group" @click.stop>
        <NuxtLink
          :to="navGroups[1].path"
          class="nav-group-header"
          :class="{ active: isActiveGroup(navGroups[1]) }"
        >
          <Icon :name="navGroups[1].icon" size="20" class="nav-icon" />
          <span class="nav-text" v-show="!isCollapsed">{{ navGroups[1].name }}</span>
          <button v-if="!isCollapsed" class="expand-btn" @click.prevent="toggleHealth">
            <Icon name="mdi:chevron-down" size="18" :class="{ rotated: healthExpanded }" />
          </button>
        </NuxtLink>

        <div
          class="nav-group-items"
          :class="{ 'temp-expanded': isCollapsed && healthTempExpanded }"
          v-show="showHealthItems"
        >
          <NuxtLink
            v-for="item in navGroups[1].items"
            :key="item.path"
            :to="item.path"
            class="nav-item sub-item"
            :class="{ active: $route.path === item.path }"
            @click="isCollapsed && (healthTempExpanded = false)"
          >
            <Icon v-if="isCollapsed" :name="item.icon" size="18" class="nav-icon" />
            <span class="nav-text">{{ item.name }}</span>
          </NuxtLink>
        </div>
      </div>

      <div class="nav-divider" v-show="!isCollapsed"></div>
      <NuxtLink to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }">
        <Icon name="mdi:cog" size="20" class="nav-icon" />
        <span class="nav-text" v-show="!isCollapsed">Settings</span>
      </NuxtLink>
    </nav>

    <div class="theme-section">
      <ThemeToggle />
    </div>

    <div class="bottom-actions">
      <button v-if="auth.isAuthenticated" @click="auth.logout" class="logout-btn">
        <Icon name="mdi:logout" size="20" class="logout-icon" />
        <span class="logout-text" v-show="!isCollapsed">Logout</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 210px;
  height: 100vh;
  background: var(--color-bg-primary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.sidebar.collapsed {
  width: 75px;
}

.toggle-btn {
  position: absolute;
  right: -14px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-hover);
  border-radius: 50%;
  color: var(--color-text-subtle);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 101;
  padding: 0;
  overflow: visible;
}

.toggle-btn:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.user-section {
  padding: 20px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--color-border);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.user-name {
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.nav-menu {
  flex: 1;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-group {
  display: flex;
  flex-direction: column;
}

.nav-group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  margin: 0 8px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background 0.2s;
}

.nav-group-header:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
}

.nav-group-header.active {
  background: var(--color-success-bg);
  color: var(--color-accent);
}

.expand-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.expand-btn .rotated {
  transform: rotate(180deg);
}

.nav-group-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 20px;
  margin-top: 4px;
}

.nav-group-items.temp-expanded {
  position: absolute;
  left: 75px;
  top: 90px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 200;
  min-width: 150px;
}

.nav-group-items.temp-expanded .nav-item {
  margin: 0;
  border-radius: 6px;
  padding: 10px 14px;
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  margin: 0 8px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background 0.2s;
  white-space: nowrap;
}

.nav-item.sub-item {
  padding: 10px 18px;
  font-size: 0.875rem;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: var(--color-success-bg);
  color: var(--color-accent);
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-text {
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.nav-divider {
  height: 1px;
  background: var(--color-border);
  margin: 8px 18px;
}

.theme-section {
  padding: 8px 0;
  border-top: 1px solid var(--color-border);
}

.bottom-actions {
  padding: 16px 0;
  border-top: 1px solid var(--color-border);
}

.logout-btn {
  width: calc(100% - 16px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  margin: 0 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.logout-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.logout-text {
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
}

.nav-menu::-webkit-scrollbar {
  width: 4px;
}

.nav-menu::-webkit-scrollbar-track {
  background: transparent;
}

.nav-menu::-webkit-scrollbar-thumb {
  background: var(--color-text-subtle);
  border-radius: 2px;
}

.nav-menu::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}
</style>
