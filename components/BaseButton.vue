<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { NuxtLink } from '#components'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  to?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  type: 'button',
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const componentType = computed(() => (props.to ? NuxtLink : 'button'))

const classes = computed(() => [
  'base-btn',
  `base-btn--${props.variant}`,
  `base-btn--${props.size}`,
  { 'base-btn--disabled': props.disabled },
])

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="classes">
    <slot />
  </NuxtLink>
  <button v-else :type="type" :disabled="disabled" :class="classes" @click="handleClick">
    <slot />
  </button>
</template>

<style scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  text-decoration: none;
}

.base-btn:disabled,
.base-btn.base-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.base-btn--sm {
  padding: 5px 10px;
  font-size: 0.75rem;
}

.base-btn--md {
  padding: 8px 16px;
  font-size: 0.875rem;
}

.base-btn--lg {
  padding: 10px 20px;
  font-size: 1rem;
}

/* Primary variant */
.base-btn--primary {
  background: var(--color-accent);
  color: var(--color-bg-primary);
  border-color: var(--color-accent);
}

.base-btn--primary:hover:not(.base-btn--disabled) {
  background: var(--color-accent-dark);
  border-color: var(--color-accent-dark);
}

/* Secondary variant */
.base-btn--secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.base-btn--secondary:hover:not(.base-btn--disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Ghost variant */
.base-btn--ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: transparent;
}

.base-btn--ghost:hover:not(.base-btn--disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* Danger variant */
.base-btn--danger {
  background: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.base-btn--danger:hover:not(.base-btn--disabled) {
  background: #dc2626;
  border-color: #dc2626;
}
</style>
