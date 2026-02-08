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
  { name: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', path: '/' },
  { name: 'Accounts', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', path: '/dashboard/balance' },
  { name: 'Transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', path: '/transactions' },
  { name: 'Settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z', path: '/settings' },
]
</script>

<template>
  <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <!-- Toggle Button -->
    <button class="toggle-btn" @click="toggle" :title="isCollapsed ? 'Expand' : 'Collapse'">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path v-if="!isCollapsed" d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
        <path v-else d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
      </svg>
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
        <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path :d="item.icon"/>
        </svg>
        <span class="nav-text" v-show="!isCollapsed">{{ item.name }}</span>
      </NuxtLink>
    </nav>

    <!-- Bottom Actions -->
    <div class="bottom-actions">
      <button v-if="auth.isAuthenticated" @click="auth.logout" class="logout-btn">
        <svg class="logout-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
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
  overflow: hidden;
}

.sidebar.collapsed {
  width: 75px;
}

/* Toggle Button */
.toggle-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
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
