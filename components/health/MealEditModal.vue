<script setup lang="ts">
import { useMeals, type Meal, type MealFood, mealTypes } from '~/composables/health/useMeals'
import BaseModal from './BaseModal.vue'

interface Props {
  show: boolean
  meal: Meal | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: []
  close: []
}>()

const { $toast } = useNuxtApp()

const isSaving = ref(false)
const editingFoods = ref<MealFood[]>([])
const showMoveFoodMenu = ref<number | null>(null)

const handleMoveFoodButtonClick = (index: number, newMealType: string, food: any) => {
  moveFoodFromEditMeal(index, newMealType, food)
  showMoveFoodMenu.value = null
}

const moveFoodFromEditMeal = async (index: number, newMealType: string, food: any) => {
  if (!props.meal) return

  try {
    const response = await $fetch('/api/health/meals', {
      method: 'POST',
      body: {
        meal_type: newMealType,
        meal_date: props.meal.mealDate,
        foods: [
          {
            food_name: food.food_name,
            food_id: food.food_id,
            servings: food.servings,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
          },
        ],
      },
    })

    editingFoods.value.splice(index, 1)
    $toast?.success(`Moved to ${newMealType}`)
  } catch (err) {
    console.error('Failed to move food:', err)
    $toast?.error('Failed to move food')
  }
}

const removeFoodFromEditMeal = (index: number) => {
  editingFoods.value.splice(index, 1)
}

const updateEditMealFood = (index: number, field: string, value: any) => {
  editingFoods.value[index][field] = value
}

const handleSave = async () => {
  if (!props.meal) return

  isSaving.value = true

  try {
    const totals = editingFoods.value.reduce(
      (acc, food) => ({
        calories: acc.calories + (Number(food.calories) || 0) * (Number(food.servings) || 1),
        protein: acc.protein + (Number(food.protein) || 0) * (Number(food.servings) || 1),
        carbs: acc.carbs + (Number(food.carbs) || 0) * (Number(food.servings) || 1),
        fat: acc.fat + (Number(food.fat) || 0) * (Number(food.servings) || 1),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    const response = await fetch(`/api/health/meals/${props.meal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        meal_type: props.meal.mealType,
        meal_date: props.meal.mealDate,
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        foods: editingFoods.value.map(f => ({
          food_name: f.food_name,
          food_id: f.food_id,
          servings: f.servings,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
        })),
      }),
    })

    if (!response.ok) throw new Error('Failed to update meal')

    $toast?.success('Meal updated')
    emit('save')
    emit('close')
  } catch (err) {
    console.error('Failed to save meal:', err)
    $toast?.error('Failed to update meal')
  } finally {
    isSaving.value = false
  }
}

watch(
  () => props.show,
  newVal => {
    if (newVal && props.meal) {
      editingFoods.value = props.meal.foods?.map((f: any) => ({ ...f })) || []
    }
  }
)
</script>

<template>
  <BaseModal :show="show" title="Edit Meal" size="lg" @close="emit('close')">
    <div class="edit-foods-list">
      <div v-for="(food, index) in editingFoods" :key="index" class="edit-food-item">
        <span class="food-name">{{ food.food_name }}</span>
        <div class="food-edit-controls">
          <input
            type="number"
            :value="food.servings"
            min="0.25"
            step="0.25"
            class="portion-input"
            @input="
              updateEditMealFood(
                index,
                'servings',
                Number(($event.target as HTMLInputElement).value)
              )
            "
          />
          <span>x</span>
          <span
            >{{ Math.round((Number(food.calories) || 0) * (Number(food.servings) || 1)) }} cal</span
          >
          <span
            >P {{ Math.round((Number(food.protein) || 0) * (Number(food.servings) || 1)) }}g</span
          >
          <span>C {{ Math.round((Number(food.carbs) || 0) * (Number(food.servings) || 1)) }}g</span>
          <span>F {{ Math.round((Number(food.fat) || 0) * (Number(food.servings) || 1)) }}g</span>

          <button
            class="move-food-btn"
            @click.stop="showMoveFoodMenu = showMoveFoodMenu === index ? null : index"
            title="Move to another meal"
          >
            <Icon name="mdi:arrow-right" size="14" />
          </button>
          <div v-if="showMoveFoodMenu === index" class="move-food-dropdown" @click.stop>
            <button
              v-for="type in mealTypes"
              :key="type.value"
              class="move-option"
              :disabled="type.value === meal?.mealType"
              @click="handleMoveFoodButtonClick(index, type.value, food)"
            >
              {{ type.label }}
            </button>
          </div>
          <button
            class="remove-food-edit-btn"
            @click="removeFoodFromEditMeal(index)"
            title="Remove food"
          >
            <Icon name="mdi:close" size="14" />
          </button>
        </div>
      </div>
      <div v-if="editingFoods.length === 0" class="empty-state">No foods in this meal</div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="emit('close')">Cancel</button>
      <button class="btn btn-primary" :disabled="isSaving" @click="handleSave">
        {{ isSaving ? 'Saving...' : 'Save Changes' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.edit-foods-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-food-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  position: relative;
}

.edit-food-item .food-name {
  flex: 1;
  font-weight: 500;
}

.food-edit-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  position: relative;
}

.food-edit-controls .portion-input {
  width: 60px;
  padding: 6px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-primary);
  text-align: center;
}

.move-food-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
}

.move-food-btn:hover {
  color: var(--color-accent);
  background: var(--color-bg-hover);
}

.move-food-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 10;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.move-option {
  display: block;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: 4px;
}

.move-option:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.move-option:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.remove-food-edit-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}

.remove-food-edit-btn:hover {
  color: var(--color-error);
  background: var(--color-bg-hover);
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--color-text-muted);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  min-width: 80px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-dark);
}
</style>
