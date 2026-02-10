<script setup lang="ts">
import { computed, type Ref } from 'vue'

interface MenuItem {
  name: string;
  icon: string;
  path: string;
}

const auth = useAuth()
const username = computed((): string => auth.user.value?.username || 'User')
const { isCollapsed, toggle } = useSidebar()

const menuItems: MenuItem[] = [
  { name: 'Dashboard', icon: 'mdi:view-dashboard', path: '/' },
  { name: 'Accounts', icon: 'mdi:bank', path: '/accounts' },
  { name: 'Transactions', icon: 'mdi:view-list', path: '/transactions' },
  { name: 'Budgets', icon: 'mdi:chart-pie', path: '/dashboard/budgets' },
  { name: 'Settings', icon: 'mdi:cog', path: '/settings' },
]
</script>

<template>
  <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <!-- Toggle Button -->
    <button class="toggle-btn" @click="toggle" :title="isCollapsed ? 'Expand' : 'Collapse'">
      <Icon v-if="!isCollapsed" name="mdi:chevron-left" size="20" />
      <Icon v-else name="mdi:chevron-right" size="20" />
    </button>

    <!-- User Profile Section - Client Only to prevent hydration mismatch -->
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

    <!-- Navigation Menu -->
    <nav class="nav-menu">
      <NuxtLink 
        v-for="item in menuItems" 
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ 'active': $route.path === item.path }"
      >
        <Icon :name="item.icon" size="20" class="nav-icon" />
        <span class="nav-text" v-show="!isCollapsed">{{ item.name }}</span>
      </NuxtLink>
    </nav>

    <!-- Theme Toggle -->
    <div class="theme-section">
      <ThemeToggle />
    </div>

    <!-- Bottom Actions -->
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

/* Toggle Button */
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

/* User Section */
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

/* Navigation Menu */
.nav-menu {
  flex: 1;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
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

/* Theme Toggle Section */
.theme-section {
  padding: 8px 0;
  border-top: 1px solid var(--color-border);
}

/* Bottom Actions */
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

.sidebar.collapsed .logout-btn {
  padding: 12px 18px;
  width: calc(100% - 16px);
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

/* Scrollbar Styling */
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
