<script setup lang="ts">
import { computed } from 'vue'

interface FoodItem {
  id: number
  name: string
  brand?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_size: number
  serving_unit: string
  type: 'food' | 'recipe'
  ingredients?: any[]
}

interface Props {
  item: FoodItem
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editable: true,
})

const emit = defineEmits<{
  edit: [item: FoodItem]
  delete: [item: FoodItem]
  duplicate: [item: FoodItem]
}>()

const isRecipe = computed(() => props.item.type === 'recipe')

const ingredientCount = computed(() => {
  return props.item.ingredients?.length || 0
})
</script>

<template>
  <div class="food-card" :class="{ 'is-recipe': isRecipe }">
    <div class="card-icon">
      <Icon v-if="isRecipe" name="mdi:chef-hat" size="24" />
      <Icon v-else name="mdi:food-apple" size="24" />
    </div>

    <div class="card-content">
      <div class="card-header">
        <div class="card-title">
          <span class="name">{{ item.name }}</span>
          <span v-if="item.brand" class="brand">{{ item.brand }}</span>
        </div>
        <div class="card-calories">
          <span class="cal-value">{{ Math.round(item.calories) }}</span>
          <span class="cal-label">cal</span>
        </div>
      </div>

      <div class="card-macros">
        <div class="macro protein">
          <Icon name="mdi:arm-flex" size="14" />
          <span>{{ Math.round(item.protein) }}g</span>
        </div>
        <div class="macro carbs">
          <Icon name="mdi:barley" size="14" />
          <span>{{ Math.round(item.carbs) }}g</span>
        </div>
        <div class="macro fat">
          <Icon name="mdi:water" size="14" />
          <span>{{ Math.round(item.fat) }}g</span>
        </div>
      </div>

      <div class="card-footer">
        <span class="serving"> {{ item.serving_size }}{{ item.serving_unit }} serving </span>
        <span v-if="isRecipe" class="ingredients">
          {{ ingredientCount }} ingredient{{ ingredientCount !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <div v-if="editable" class="card-actions">
      <button class="action-btn" title="Duplicate" @click="emit('duplicate', item)">
        <Icon name="mdi:content-copy" size="18" />
      </button>
      <button class="action-btn" title="Edit" @click="emit('edit', item)">
        <Icon name="mdi:pencil" size="18" />
      </button>
      <button class="action-btn delete" title="Delete" @click="emit('delete', item)">
        <Icon name="mdi:delete-outline" size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.food-card {
  display: flex;
  align-items: stretch;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    border-color 0.15s;
}

.food-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--color-accent);
}

.food-card.is-recipe {
  border-left: 3px solid var(--color-accent);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  background: var(--color-bg);
  color: var(--color-accent);
  flex-shrink: 0;
}

.is-recipe .card-icon {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.card-content {
  flex: 1;
  padding: 14px 16px;
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.card-title {
  min-width: 0;
}

.name {
  display: block;
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-calories {
  text-align: right;
  flex-shrink: 0;
}

.cal-value {
  display: block;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.cal-label {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-macros {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.macro {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--color-bg);
}

.macro.protein {
  color: #3b82f6;
}

.macro.carbs {
  color: #f97316;
}

.macro.fat {
  color: #eab308;
}

.card-footer {
  display: flex;
  gap: 12px;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.serving {
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.ingredients {
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.card-actions {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border);
  background: var(--color-bg);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  color: var(--color-accent);
  background: var(--color-bg-hover);
}

.action-btn.delete:hover {
  color: var(--color-error);
}

@media (max-width: 640px) {
  .food-card {
    flex-wrap: wrap;
  }

  .card-icon {
    width: 48px;
    height: 48px;
  }

  .card-content {
    flex: 1 1 calc(100% - 48px);
  }

  .card-actions {
    flex-direction: row;
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--color-border);
  }

  .action-btn {
    flex: 1;
    padding: 10px;
  }
}
</style>
