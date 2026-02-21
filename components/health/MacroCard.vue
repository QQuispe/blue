<template>
  <div class="macro-card">
    <div class="macro-header">
      <span class="macro-label">{{ label }}</span>
      <span class="macro-value">{{ current }} / {{ target }}{{ unit }}</span>
    </div>
    <ProgressBar :percentage="percentage" :color="color">
      <template #label v-if="showPercentage">
        <span class="percentage-label">{{ percentage.toFixed(0) }}%</span>
      </template>
    </ProgressBar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from '~/components/ProgressBar.vue'

interface Props {
  label: string
  current: number
  target: number
  unit?: string
  color?: 'accent' | 'success' | 'warning' | 'error' | 'info'
  showPercentage?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  unit: 'g',
  color: 'accent',
  showPercentage: true,
})

const percentage = computed(() => {
  if (props.target === 0) return 0
  return Math.min((props.current / props.target) * 100, 100)
})
</script>

<style scoped>
.macro-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.macro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.macro-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.macro-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.percentage-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 4px;
}
</style>
