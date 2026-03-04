<script setup lang="ts">
import { computed } from 'vue'

interface FoodItem {
  id: number
  name: string
  food_name?: string
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

const displayName = computed(() => {
  return props.item.name || props.item.food_name || 'Unnamed'
})

const displayCalories = computed(() => {
  const val = Number(props.item.calories)
  return isNaN(val) ? '--' : Math.round(val)
})

const displayProtein = computed(() => {
  const val = Number(props.item.protein)
  return isNaN(val) ? '--' : Math.round(val)
})

const displayCarbs = computed(() => {
  const val = Number(props.item.carbs)
  return isNaN(val) ? '--' : Math.round(val)
})

const displayFat = computed(() => {
  const val = Number(props.item.fat)
  return isNaN(val) ? '--' : Math.round(val)
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
          <!-- Mobile inline icon -->
          <span class="mobile-icon">
            <Icon v-if="isRecipe" name="mdi:chef-hat" size="18" />
            <Icon v-else name="mdi:food-apple" size="18" />
          </span>
          <span class="name">{{ displayName }}</span>
          <span v-if="item.brand" class="brand">{{ item.brand }}</span>
        </div>
        <div class="card-calories">
          <span class="cal-value">{{ displayCalories }}</span>
          <span class="cal-label">cal</span>
        </div>
      </div>

      <div class="card-macros">
        <div class="macro protein">
          <Icon name="mdi:arm-flex" size="14" />
          <span>{{ displayProtein }}g</span>
        </div>
        <div class="macro carbs">
          <Icon name="mdi:barley" size="14" />
          <span>{{ displayCarbs }}g</span>
        </div>
        <div class="macro fat">
          <Icon name="mdi:water" size="14" />
          <span>{{ displayFat }}g</span>
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

/* Hide mobile icon by default (desktop) */
.mobile-icon {
  display: none;
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
    flex-direction: column;
    padding: 12px;
    gap: 8px;
  }

  .card-icon {
    display: none; /* Hide the large left icon on mobile */
  }

  .card-content {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 0;
  }

  .card-title {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Mobile inline icon styling */
  .mobile-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .is-recipe .mobile-icon {
    color: #3b82f6;
  }

  .name {
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .brand {
    display: none; /* Hide brand on mobile to save space */
  }

  .card-calories {
    text-align: right;
    flex-shrink: 0;
  }

  .cal-value {
    font-size: 0.9375rem;
  }

  .cal-label {
    font-size: 0.625rem;
  }

  .card-macros {
    gap: 8px;
    margin-bottom: 0;
  }

  .macro {
    font-size: 0.6875rem;
    padding: 2px 6px;
    gap: 2px;
  }

  .macro :deep(svg) {
    width: 12px;
    height: 12px;
  }

  .card-footer {
    font-size: 0.625rem;
    gap: 8px;
  }

  .card-actions {
    flex-direction: row;
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--color-border);
    padding-top: 8px;
    margin-top: 4px;
  }

  .action-btn {
    flex: 1;
    padding: 8px;
  }
}
</style>
