<script setup lang="ts">
import { useFoodSearch } from '~/composables/health/useFoodSearch'
import { useMeals, mealTypes } from '~/composables/health/useMeals'

interface Props {
  show: boolean
  recipe?: any | null
}

const props = withDefaults(defineProps<Props>(), {
  recipe: null,
})

const emit = defineEmits<{
  save: [recipe: any]
  close: []
}>()

const { $toast } = useNuxtApp()

const isEditing = computed(() => !!props.recipe)
const isSaving = ref(false)

const { customFoods, savedMeals, fetchCustomFoods, fetchSavedMeals } = useFoodSearch()

const form = ref({
  name: '',
  meal_type: 'breakfast',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  ingredients: [] as any[],
})

const ingredientSearch = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const showCustomForm = ref(false)
const customIngredient = ref({
  food_name: '',
  servings: 1,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
})

const calculatedMacros = computed(() => {
  return form.value.ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (Number(ing.calories) || 0) * (Number(ing.servings) || 1),
      protein: acc.protein + (Number(ing.protein) || 0) * (Number(ing.servings) || 1),
      carbs: acc.carbs + (Number(ing.carbs) || 0) * (Number(ing.servings) || 1),
      fat: acc.fat + (Number(ing.fat) || 0) * (Number(ing.servings) || 1),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
})

const searchIngredients = async () => {
  if (!ingredientSearch.value.trim()) {
    searchResults.value = []
    return
  }

  isSearching.value = true

  try {
    const response = await fetch(
      `/api/health/foods/search?q=${encodeURIComponent(ingredientSearch.value)}`,
      { credentials: 'include' }
    )

    if (response.ok) {
      const data = await response.json()
      searchResults.value = data.foods || []
    }
  } catch (err) {
    console.error('Search error:', err)
  } finally {
    isSearching.value = false
  }
}

const addIngredient = (item: any) => {
  form.value.ingredients.push({
    food_name: item.name || item.description,
    food_id: item.fdcId || item.id,
    servings: 1,
    calories: item.calories || 0,
    protein: item.protein || 0,
    carbs: item.carbs || 0,
    fat: item.fat || 0,
    type: item.has_ingredients ? 'recipe' : 'food',
  })
  ingredientSearch.value = ''
  searchResults.value = []
}

const addCustomIngredient = () => {
  if (!customIngredient.value.food_name) return

  form.value.ingredients.push({
    ...customIngredient.value,
    type: 'custom',
  })

  customIngredient.value = {
    food_name: '',
    servings: 1,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  }
  showCustomForm.value = false
}

const removeIngredient = (index: number) => {
  form.value.ingredients.splice(index, 1)
}

const updateServings = (index: number, value: number) => {
  form.value.ingredients[index].servings = value
}

const handleSave = async () => {
  if (!form.value.name) {
    $toast?.error('Recipe name is required')
    return
  }

  if (form.value.ingredients.length === 0) {
    $toast?.error('Add at least one ingredient')
    return
  }

  isSaving.value = true

  try {
    const payload = {
      name: form.value.name,
      meal_type: form.value.meal_type,
      total_calories: calculatedMacros.value.calories,
      total_protein: calculatedMacros.value.protein,
      total_carbs: calculatedMacros.value.carbs,
      total_fat: calculatedMacros.value.fat,
      ingredients: form.value.ingredients.map(ing => ({
        food_name: ing.food_name,
        food_id: ing.food_id,
        servings: ing.servings,
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fat: ing.fat,
      })),
    }

    let response

    if (isEditing.value && props.recipe) {
      response = await fetch(`/api/health/saved-meals/${props.recipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
    } else {
      response = await fetch('/api/health/saved-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
    }

    if (!response.ok) {
      throw new Error('Failed to save recipe')
    }

    $toast?.success(isEditing.value ? 'Recipe updated!' : 'Recipe created!')
    emit('save', await response.json())
    emit('close')
  } catch (err) {
    console.error('Error saving recipe:', err)
    $toast?.error('Failed to save recipe')
  } finally {
    isSaving.value = false
  }
}

watch(
  () => props.show,
  newVal => {
    if (newVal) {
      if (props.recipe) {
        form.value = {
          name: props.recipe.name,
          meal_type: props.recipe.meal_type || 'breakfast',
          calories: props.recipe.totalCalories,
          protein: props.recipe.totalProtein,
          carbs: props.recipe.totalCarbs,
          fat: props.recipe.totalFat,
          ingredients: props.recipe.ingredients || [],
        }
      } else {
        form.value = {
          name: '',
          meal_type: 'breakfast',
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          ingredients: [],
        }
      }
    }
  }
)

onMounted(() => {
  fetchCustomFoods()
  fetchSavedMeals()
})
</script>

<template>
  <BaseModal
    :show="show"
    :title="isEditing ? 'Edit Recipe' : 'Create Recipe'"
    size="lg"
    @close="emit('close')"
  >
    <div class="form-group">
      <label>Recipe Name *</label>
      <input v-model="form.name" type="text" placeholder="e.g., My Chicken Salad" />
    </div>

    <div class="form-group">
      <label>Meal Type</label>
      <select v-model="form.meal_type">
        <option v-for="type in mealTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>
    </div>

    <div class="ingredients-section">
      <label>Ingredients</label>

      <div class="ingredient-search">
        <input
          v-model="ingredientSearch"
          type="text"
          placeholder="Search foods..."
          @input="searchIngredients"
        />
        <button class="btn btn-sm" @click="showCustomForm = !showCustomForm">Custom</button>
      </div>

      <div v-if="searchResults.length" class="search-results">
        <div
          v-for="item in searchResults"
          :key="item.fdcId"
          class="result-item"
          @click="addIngredient(item)"
        >
          <span class="result-name">{{ item.description || item.name }}</span>
          <span class="result-cal">{{ item.calories }} cal</span>
        </div>
      </div>

      <div v-if="showCustomForm" class="custom-form">
        <input v-model="customIngredient.food_name" type="text" placeholder="Ingredient name" />
        <input
          v-model.number="customIngredient.servings"
          type="number"
          placeholder="Servings"
          class="servings-input"
        />
        <input
          v-model.number="customIngredient.calories"
          type="number"
          placeholder="Cal"
          class="macro-input"
        />
        <input
          v-model.number="customIngredient.protein"
          type="number"
          placeholder="P"
          class="macro-input"
        />
        <input
          v-model.number="customIngredient.carbs"
          type="number"
          placeholder="C"
          class="macro-input"
        />
        <input
          v-model.number="customIngredient.fat"
          type="number"
          placeholder="F"
          class="macro-input"
        />
        <button class="btn btn-sm btn-primary" @click="addCustomIngredient">Add</button>
      </div>

      <div v-if="form.ingredients.length" class="ingredients-list">
        <div v-for="(ing, index) in form.ingredients" :key="index" class="ingredient-item">
          <span class="ing-name">{{ ing.food_name }}</span>
          <input
            type="number"
            :value="ing.servings"
            min="0.25"
            step="0.25"
            class="servings-input"
            @input="updateServings(index, Number(($event.target as HTMLInputElement).value))"
          />
          <span class="ing-cal"> {{ Math.round(ing.calories * ing.servings) }} cal </span>
          <button class="remove-btn" @click="removeIngredient(index)">
            <Icon name="mdi:close" size="14" />
          </button>
        </div>
        <div class="ingredients-total">
          <strong>Total:</strong>
          {{ calculatedMacros.calories.toFixed(0) }} cal | P:
          {{ calculatedMacros.protein.toFixed(0) }}g | C: {{ calculatedMacros.carbs.toFixed(0) }}g |
          F: {{ calculatedMacros.fat.toFixed(0) }}g
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="emit('close')">Cancel</button>
      <button
        class="btn btn-primary"
        :disabled="isSaving || !form.name || form.ingredients.length === 0"
        @click="handleSave"
      >
        {{ isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.ingredients-section {
  margin-top: 20px;
}

.ingredients-section > label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.ingredient-search {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.ingredient-search input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
}

.search-results {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
}

.result-item:hover {
  background: var(--color-bg-hover);
}

.result-item:last-child {
  border-bottom: none;
}

.result-name {
  font-weight: 500;
}

.result-cal {
  color: var(--color-text-muted);
}

.custom-form {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 8px;
}

.custom-form input {
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.custom-form input:first-child {
  flex: 1;
}

.servings-input {
  width: 60px;
}

.macro-input {
  width: 50px;
}

.ingredients-list {
  margin-top: 12px;
}

.ingredient-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.ing-name {
  flex: 1;
}

.ing-cal {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.remove-btn {
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

.remove-btn:hover {
  color: var(--color-error);
  background: var(--color-bg-hover);
}

.ingredients-total {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
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
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 8px 12px;
  font-size: 0.8125rem;
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
