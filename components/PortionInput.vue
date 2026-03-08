<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const MIN_VALUE = 1

const displayValue = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

const canDecrement = computed(() => {
  return props.modelValue > MIN_VALUE
})

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const val = parseFloat(target.value)

  // Allow any value when typing (including below 1)
  if (!isNaN(val) && val >= 0) {
    emit('update:modelValue', val)
  }
}

const increment = () => {
  // Always go to next whole number
  const current = props.modelValue || 0
  const next = Math.floor(current) + 1
  emit('update:modelValue', next)
}

const decrement = () => {
  // Go to previous whole number, minimum 1
  const current = props.modelValue || 0
  const prev = Math.max(MIN_VALUE, Math.ceil(current) - 1)
  emit('update:modelValue', prev)
}
</script>

<template>
  <div class="portion-input-wrapper">
    <input
      :value="displayValue"
      type="number"
      class="portion-input"
      min="0"
      step="any"
      @input="handleInput"
      @click.stop
    />

    <div class="step-buttons">
      <button
        type="button"
        class="step-btn up-btn"
        @click.stop="increment"
        aria-label="Increase portion"
      >
        <Icon name="mdi:chevron-up" size="16" />
      </button>
      <button
        type="button"
        class="step-btn down-btn"
        :disabled="!canDecrement"
        @click.stop="decrement"
        aria-label="Decrease portion"
      >
        <Icon name="mdi:chevron-down" size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.portion-input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
}

.step-buttons {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0;
  z-index: 2;
}

.step-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 16px;
  padding: 0;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.up-btn {
  border-bottom: none;
  border-radius: 3px 3px 0 0;
}

.down-btn {
  border-radius: 0 0 3px 3px;
}

.step-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}

.step-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--color-bg-elevated);
}

.portion-input {
  width: 65px;
  padding: 6px 28px 6px 8px;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  height: 36px;
  position: relative;
  z-index: 1;
}

.portion-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Hide number input arrows */
.portion-input::-webkit-outer-spin-button,
.portion-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.portion-input[type='number'] {
  -moz-appearance: textfield;
}
</style>
