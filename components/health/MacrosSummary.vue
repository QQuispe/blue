<script setup lang="ts">
import { useHealthMacros } from '~/composables/health/useHealthMacros'
import MacroCard from './MacroCard.vue'

const { targetMacros, todaysMacros, remainingMacros, macroProgress } = useHealthMacros()

const emit = defineEmits<{
  'edit-targets': []
}>()

const formatNumber = (num: number) => {
  if (num === null || num === undefined || typeof num !== 'number') return '0'
  return num.toFixed(0)
}
</script>

<template>
  <div class="macros-summary">
    <div class="summary-header">
      <h3>Today's Macros</h3>
      <button class="edit-targets-btn" @click="emit('edit-targets')">Edit Targets</button>
    </div>

    <div class="summary-calories">
      <span class="remaining">
        {{ formatNumber(remainingMacros.calories) }} cal remaining
        <span class="divider">of {{ formatNumber(targetMacros.calories) }}</span>
      </span>
    </div>

    <div class="macros-grid">
      <MacroCard
        label="Calories"
        :current="todaysMacros.calories"
        :target="targetMacros.calories"
        unit=""
        color="accent"
      />
      <MacroCard
        label="Protein"
        :current="todaysMacros.protein"
        :target="targetMacros.protein"
        color="info"
      />
      <MacroCard
        label="Carbs"
        :current="todaysMacros.carbs"
        :target="targetMacros.carbs"
        color="warning"
      />
      <MacroCard label="Fat" :current="todaysMacros.fat" :target="targetMacros.fat" color="error" />
    </div>
  </div>
</template>

<style scoped>
.macros-summary {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.remaining {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.divider {
  color: var(--color-text-muted);
}

.edit-targets-btn {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.edit-targets-btn:hover {
  color: var(--color-accent);
  background: var(--color-bg-hover);
}

.summary-calories {
  margin-bottom: 16px;
}

.macros-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 640px) {
  .macros-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
