<template>
  <div class="stat-card" :class="{ clickable }" @click="$emit('click')">
    <div class="stat-header" v-if="icon || $slots.header">
      <div class="stat-icon" :class="iconColor">
        <slot name="icon">
          <Icon :name="icon" size="24" v-if="icon" />
        </slot>
      </div>
      <slot name="header" />
    </div>

    <div class="stat-content">
      <span class="stat-label">{{ label }}</span>
      <span class="stat-value">{{ formattedValue }}</span>
      <span class="stat-unit" v-if="unit">{{ unit }}</span>
    </div>

    <div class="stat-secondary" v-if="secondary !== undefined">
      <span class="secondary-value" :class="secondaryClass">
        {{ secondaryPrefix }}{{ secondary }}
      </span>
      <span class="secondary-label" v-if="secondaryLabel">{{ secondaryLabel }}</span>
    </div>

    <div class="stat-progress" v-if="progress !== undefined">
      <ProgressBar :percentage="progress" :color="progressColor">
        <template #label v-if="$slots.progressLabel">
          <slot name="progressLabel" />
        </template>
      </ProgressBar>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  value?: number | string
  unit?: string
  icon?: string
  iconColor?: 'accent' | 'success' | 'warning' | 'error' | 'info'
  secondary?: number | string
  secondaryLabel?: string
  secondaryPrefix?: string
  progress?: number
  progressColor?: 'accent' | 'success' | 'warning' | 'error' | 'info'
  decimals?: number
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'accent',
  secondaryPrefix: '',
  decimals: 0,
  clickable: false,
  progressColor: 'accent',
})

defineEmits(['click'])

const formattedValue = computed(() => {
  if (props.value === undefined || props.value === null) return '--'
  if (typeof props.value === 'string') return props.value
  return props.value.toFixed(props.decimals)
})

const secondaryClass = computed(() => {
  if (props.secondary === undefined) return ''
  const num = Number(props.secondary)
  if (isNaN(num)) return ''
  if (num > 0) return 'positive'
  if (num < 0) return 'negative'
  return ''
})
</script>

<style scoped>
.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border-hover);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.accent {
  background: var(--color-accent);
  background: var(--color-accent-bg, rgba(var(--color-accent-rgb), 0.1));
  color: var(--color-accent);
}

.stat-icon.success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.stat-icon.warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.stat-icon.error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.stat-icon.info {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-unit {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

.stat-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.secondary-value.positive {
  color: var(--color-success);
}

.secondary-value.negative {
  color: var(--color-error);
}

.secondary-label {
  color: var(--color-text-muted);
}

.stat-progress {
  margin-top: 8px;
}
</style>
