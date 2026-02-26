<script setup lang="ts">
import { useMeals } from '~/composables/health/useMeals'

interface Props {
  meal: {
    mealType: string
    foods: any[]
    totalCalories: number
    totalProtein: number
    totalCarbs: number
    totalFat: number
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [meal: any]
  delete: []
  copy: [mealType: string]
}>()

const { mealTypes } = useMeals()

const mealLabel = computed(() => {
  const found = mealTypes.find(m => m.value === props.meal.mealType)
  return found?.label || props.meal.mealType
})

const formatNumber = (num: number) => {
  if (num === null || num === undefined || typeof num !== 'number') return '0'
  return num.toFixed(0)
}
</script>

<template>
  <div class="meal-card">
    <div class="meal-header">
      <h3 class="meal-type-label">{{ mealLabel }}</h3>
      <div class="meal-actions">
        <button
          class="action-btn"
          @click="emit('copy', props.meal.mealType)"
          title="Copy from yesterday"
        >
          <Icon name="mdi:content-copy" size="18" />
        </button>
        <button class="action-btn" @click="emit('edit', props.meal)" title="Edit meal">
          <Icon name="mdi:pencil-outline" size="18" />
        </button>
        <button class="action-btn delete" @click="emit('delete')" title="Delete meal">
          <Icon name="mdi:delete-outline" size="18" />
        </button>
      </div>
    </div>

    <div class="meal-foods">
      <div v-for="food in meal.foods" :key="food.id" class="food-item">
        <span class="food-name">{{ food.food_name }}</span>
        <span class="food-portion">{{ food.servings }}x</span>
        <span class="food-calories">{{ formatNumber(food.calories) }} cal</span>
      </div>
      <div v-if="!meal.foods?.length" class="empty-foods">No foods logged</div>
    </div>

    <div class="meal-totals">
      <span>{{ formatNumber(meal.totalCalories) }} cal</span>
      <span>P: {{ formatNumber(meal.totalProtein) }}g</span>
      <span>C: {{ formatNumber(meal.totalCarbs) }}g</span>
      <span>F: {{ formatNumber(meal.totalFat) }}g</span>
    </div>
  </div>
</template>

<style scoped>
.meal-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
}

.meal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.meal-type-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: capitalize;
  margin: 0;
}

.meal-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.action-btn.delete:hover {
  color: var(--color-error);
}

.meal-foods {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.food-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.food-name {
  flex: 1;
  color: var(--color-text-primary);
}

.food-portion {
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.food-calories {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}

.empty-foods {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-style: italic;
}

.meal-totals {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}
</style>
