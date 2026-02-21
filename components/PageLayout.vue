<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  subtitle?: string
  showBack?: boolean
  backTo?: string
  maxWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  showBack: false,
  backTo: '/',
  maxWidth: 'none',
})

const backRoute = computed(() => props.backTo)
const contentMaxWidth = computed(() => (props.maxWidth === 'none' ? 'none' : `${props.maxWidth}px`))
</script>

<template>
  <div class="page-layout">
    <header class="page-header">
      <div class="header-title">
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="header-actions">
        <slot name="header-actions" />
        <slot name="actions" />
      </div>
    </header>

    <main class="page-content" :style="{ maxWidth: contentMaxWidth }">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.page-layout {
  padding: 16px;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  width: 100%;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.header-title h1 {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.header-title p {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text-primary);
}

.page-content {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .page-layout {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
  }

  .header-title h1 {
    font-size: 1.5rem;
  }
}
</style>
