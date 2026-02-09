<script setup lang="ts">
const { isDark, toggleMode } = useTheme()
const { isCollapsed } = useSidebar()
</script>

<template>
  <div class="theme-toggle-wrapper">
    <button 
      class="theme-toggle" 
      @click="toggleMode"
      :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      :class="{ 'collapsed': isCollapsed }"
    >
      <div class="toggle-track" :class="{ 'dark': isDark }">
        <div class="toggle-icons">
          <Icon name="mdi:white-balance-sunny" size="14" class="sun-icon" />
          <Icon name="mdi:moon-waning-crescent" size="14" class="moon-icon" />
        </div>
        <div class="toggle-thumb" :class="{ 'dark': isDark }"></div>
      </div>
      <span v-show="!isCollapsed" class="toggle-label">
        {{ isDark ? 'Dark Mode' : 'Light Mode' }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.theme-toggle-wrapper {
  padding: 8px 16px;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text-secondary);
}

.theme-toggle:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.theme-toggle.collapsed {
  justify-content: center;
  padding: 8px;
}

.toggle-track {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.toggle-track.dark {
  background: var(--color-bg-elevated);
  border-color: var(--color-accent);
}

.toggle-icons {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 5px;
}

.sun-icon {
  color: #f59e0b;
}

.moon-icon {
  color: #8b5cf6;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: var(--color-text-primary);
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-thumb.dark {
  transform: translateX(20px);
  background: var(--color-accent);
}

.toggle-label {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}
</style>
