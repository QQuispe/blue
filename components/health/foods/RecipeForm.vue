<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useFoodSearch } from '~/composables/health/useFoodSearch'

interface Ingredient {
  food_name: string
  food_id?: number
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  type: 'food' | 'recipe' | 'custom'
}

interface RecipeFormData {
  name: string
  meal_type: string
  ingredients: Ingredient[]
}

interface Props {
  recipe?: any | null
}

const props = withDefaults(defineProps<Props>(), {
  recipe: null,
})

const emit = defineEmits<{
  save: [recipe: any]
  cancel: []
}>()

const { $toast } = useNuxtApp()

const isEditing = computed(() => !!props.recipe)
const isSaving = ref(false)

const { customFoods, savedMeals } = useFoodSearch()

const form = ref<RecipeFormData>({
  name: '',
  meal_type: 'breakfast',
  ingredients: [],
})

const ingredientSearch = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)

const mealTypes = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

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
  form.value.ingredients.push({
    food_name: 'Custom Ingredient',
    servings: 1,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    type: 'custom',
  })
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
  } catch (err) {
    console.error('Error saving recipe:', err)
    $toast?.error('Failed to save recipe')
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  form.value = { name: '', meal_type: 'breakfast', ingredients: [] }
  emit('cancel')
}

watch(
  () => props.recipe,
  newRecipe => {
    if (newRecipe) {
      form.value = {
        name: newRecipe.name || '',
        meal_type: newRecipe.meal_type || 'breakfast',
        ingredients: newRecipe.ingredients || [],
      }
    } else {
      form.value = { name: '', meal_type: 'breakfast', ingredients: [] }
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="recipe-form">
    <div class="form-header">
      <h3>{{ isEditing ? 'Edit Recipe' : 'Add Recipe' }}</h3>
      <p class="form-subtitle">
        {{ isEditing ? 'Update your recipe below' : 'Create a recipe from your foods' }}
      </p>
    </div>

    <div class="form-body">
      <div class="form-group">
        <label>Recipe Name *</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="e.g., Protein Pancakes"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label>Meal Type</label>
        <select v-model="form.meal_type" class="form-input">
          <option v-for="type in mealTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
      </div>

      <div class="form-section">
        <label class="section-label">Ingredients</label>

        <div class="ingredient-search">
          <input
            v-model="ingredientSearch"
            type="text"
            placeholder="Search foods..."
            class="form-input"
            @input="searchIngredients"
          />
          <div v-if="searchResults.length > 0" class="search-results">
            <div
              v-for="result in searchResults"
              :key="result.fdcId || result.id"
              class="search-result-item"
              @click="addIngredient(result)"
            >
              <span class="result-name">{{ result.name || result.description }}</span>
              <span class="result-cal">{{ result.calories || 0 }} cal</span>
            </div>
          </div>
        </div>

        <button type="button" class="btn btn-secondary btn-sm" @click="addCustomIngredient">
          + Add Custom Ingredient
        </button>

        <div v-if="form.ingredients.length > 0" class="ingredients-list">
          <div v-for="(ing, index) in form.ingredients" :key="index" class="ingredient-item">
            <div class="ingredient-info">
              <span class="ingredient-name">{{ ing.food_name }}</span>
              <div class="ingredient-macros">
                {{ Math.round(ing.calories * ing.servings) }} cal |
                {{ Math.round(ing.protein * ing.servings) }}g P
              </div>
            </div>
            <div class="ingredient-actions">
              <input
                type="number"
                :value="ing.servings"
                min="0.25"
                step="0.25"
                class="servings-input"
                @input="
                  e => updateServings(index, parseFloat((e.target as HTMLInputElement).value) || 1)
                "
              />
              <button type="button" class="btn-icon" @click="removeIngredient(index)">
                <Icon name="mdi:close" size="16" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="no-ingredients">
          No ingredients added yet. Search for foods or add custom ingredients.
        </div>
      </div>

      <div class="macros-summary">
        <div class="macro-badge">
          <span class="macro-value">{{ Math.round(calculatedMacros.calories) }}</span>
          <span class="macro-label">calories</span>
        </div>
        <div class="macro-badge protein">
          <span class="macro-value">{{ Math.round(calculatedMacros.protein) }}g</span>
          <span class="macro-label">protein</span>
        </div>
        <div class="macro-badge carbs">
          <span class="macro-value">{{ Math.round(calculatedMacros.carbs) }}g</span>
          <span class="macro-label">carbs</span>
        </div>
        <div class="macro-badge fat">
          <span class="macro-value">{{ Math.round(calculatedMacros.fat) }}g</span>
          <span class="macro-label">fat</span>
        </div>
      </div>
    </div>

    <div class="form-footer">
      <button type="button" class="btn btn-secondary" :disabled="isSaving" @click="handleCancel">
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="isSaving || !form.name || form.ingredients.length === 0"
        @click="handleSave"
      >
        {{ isSaving ? 'Saving...' : isEditing ? 'Update Recipe' : 'Add Recipe' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.recipe-form {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.form-header {
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}

.form-header h3 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.form-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-section {
  margin-bottom: 20px;
}

.section-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.ingredient-search {
  position: relative;
  margin-bottom: 12px;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.search-result-item:hover {
  background: var(--color-bg-hover);
}

.result-name {
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.result-cal {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-sm {
  padding: 8px 14px;
  font-size: 0.8125rem;
}

.btn-secondary {
  background: var(--color-bg);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-dark);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ingredients-list {
  margin-top: 16px;
}

.ingredient-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-elevated);
  border-radius: 8px;
  margin-bottom: 8px;
}

.ingredient-info {
  flex: 1;
}

.ingredient-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
  display: block;
}

.ingredient-macros {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.ingredient-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.servings-input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.8125rem;
  text-align: center;
}

.servings-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
}

.btn-icon:hover {
  color: var(--color-error);
  background: var(--color-bg-hover);
}

.no-ingredients {
  text-align: center;
  padding: 24px;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.macros-summary {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-elevated);
  border-radius: 12px;
  margin-top: 20px;
}

.macro-badge {
  flex: 1;
  text-align: center;
  padding: 12px 8px;
  background: var(--color-bg);
  border-radius: 8px;
}

.macro-value {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.macro-label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.macro-badge.protein .macro-value {
  color: #3b82f6;
}

.macro-badge.carbs .macro-value {
  color: #f97316;
}

.macro-badge.fat .macro-value {
  color: #eab308;
}

.form-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
}

.form-footer .btn {
  flex: 1;
}

@media (max-width: 640px) {
  .form-header,
  .form-body,
  .form-footer {
    padding: 16px;
  }

  .macros-summary {
    flex-wrap: wrap;
  }

  .macro-badge {
    min-width: calc(50% - 6px);
  }
}
</style>
