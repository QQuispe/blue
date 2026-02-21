<template>
  <div class="progress-container">
    <div class="progress-bar">
      <div class="progress-fill" :class="colorClass" :style="{ width: `${percentage}%` }"></div>
    </div>
    <slot name="label" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  percentage: number
  color?: 'accent' | 'success' | 'warning' | 'error' | 'info'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'accent',
})

const colorClass = computed(() => `progress-${props.color}`)
</script>

<style scoped>
.progress-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.progress-bar {
  height: 8px;
  background: var(--color-bg-elevated);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-accent {
  background: var(--color-accent);
}

.progress-success {
  background: var(--color-success);
}

.progress-warning {
  background: var(--color-warning);
}

.progress-error {
  background: var(--color-error);
}

.progress-info {
  background: var(--color-info);
}
</style>
