<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/BaseButton.vue'

interface Props {
  title: string
  showBack?: boolean
  backTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  showBack: true,
  backTo: '/'
})

const backRoute = computed(() => props.backTo)
</script>

<template>
  <div class="page-layout">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ title }}</h1>
      </div>
      <div class="header-actions">
        <slot name="header-actions" />
        <BaseButton
          v-if="showBack"
          variant="secondary"
          size="sm"
          :to="backRoute"
          class="back-btn"
        >
          <Icon name="mdi:arrow-left" size="16" />
          Back
        </BaseButton>
      </div>
    </header>

    <!-- Content -->
    <main class="page-content">
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
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.page-title {
  color: var(--color-text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
