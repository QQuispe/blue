<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useFoodSearch } from '~/composables/health/useFoodSearch'
import { useEventBus, EVENTS } from '~/composables/useEventBus'
import { useMacroFormatting } from '~/composables/useMacroFormatting'
import PortionInput from '~/components/PortionInput.vue'

const { formatCalories, formatMacro } = useMacroFormatting()

interface Ingredient {
  food_name: string
  food_id?: number
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  type: 'food' | 'recipe' | 'custom'
  isNew?: boolean
}

interface RecipeFormData {
  name: string
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
const { emit: emitEvent } = useEventBus()

const isEditing = computed(() => !!props.recipe)
const isSaving = ref(false)

const { customFoods, savedMeals } = useFoodSearch()

const form = ref<RecipeFormData>({
  name: '',
  ingredients: [],
})

const ingredientSearch = ref('')
const isSearching = ref(false)
const editingIngredientIndex = ref<number | null>(null)
const isSavingIngredient = ref(false)
const showDropdown = ref(false)

// Search only from local custom foods (not USDA)
const filteredFoods = computed(() => {
  if (!ingredientSearch.value.trim() || ingredientSearch.value.length < 2) {
    return [] // Don't show when not searching
  }
  const query = ingredientSearch.value.toLowerCase()
  return customFoods.value
    .filter(f => f.name?.toLowerCase().includes(query) || f.brand?.toLowerCase().includes(query))
    .slice(0, 10)
})

const showAddCustomOption = computed(() => {
  if (!ingredientSearch.value.trim() || ingredientSearch.value.length < 2) return false
  const query = ingredientSearch.value.toLowerCase()
  const hasMatch = customFoods.value.some(f => f.name?.toLowerCase() === query)
  return !hasMatch
})

const onSearchFocus = () => {
  if (
    ingredientSearch.value.length >= 2 ||
    filteredFoods.value.length > 0 ||
    showAddCustomOption.value
  ) {
    showDropdown.value = true
  }
}

const onSearchBlur = () => {
  // Delay to allow click on dropdown item
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

const onSearchInput = () => {
  if (ingredientSearch.value.length >= 2) {
    showDropdown.value = true
  } else {
    showDropdown.value = false
  }
}

const addIngredient = (item: any) => {
  form.value.ingredients.push({
    food_name: item.name,
    food_id: item.id,
    servings: 1,
    calories: item.calories || 0,
    protein: item.protein || 0,
    carbs: item.carbs || 0,
    fat: item.fat || 0,
    type: 'food',
  })
  ingredientSearch.value = ''
  showDropdown.value = false
}

const addAsCustomIngredient = async () => {
  if (!ingredientSearch.value.trim()) return

  isSavingIngredient.value = true

  try {
    const payload = {
      name: ingredientSearch.value,
      brand: null,
      serving_size: 100,
      serving_unit: 'g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }

    const response = await fetch('/api/health/foods/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error('Failed to create food')
    }

    const result = await response.json()
    const newFood = result.food

    // Add to recipe
    form.value.ingredients.push({
      food_name: newFood.name,
      food_id: newFood.id,
      servings: 1,
      calories: newFood.calories || 0,
      protein: newFood.protein || 0,
      carbs: newFood.carbs || 0,
      fat: newFood.fat || 0,
      type: 'food',
      isNew: true, // Mark as newly created
    })

    // Update local custom foods
    customFoods.value = [...customFoods.value, newFood]

    $toast?.success('Food created and added!')
    ingredientSearch.value = ''
    showDropdown.value = false
  } catch (err) {
    console.error('Error creating custom food:', err)
    $toast?.error('Failed to create food')
  } finally {
    isSavingIngredient.value = false
  }
}

const removeIngredient = (index: number) => {
  form.value.ingredients.splice(index, 1)
}

const updateServings = (index: number, value: number) => {
  form.value.ingredients[index].servings = value
}

const toggleEditIngredient = (index: number) => {
  editingIngredientIndex.value = editingIngredientIndex.value === index ? null : index
}

const updateIngredientServings = (index: number, servings: number) => {
  if (form.value.ingredients[index]) {
    form.value.ingredients[index].servings = Math.max(0.1, servings)
  }
}

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
        type: ing.food_id ? 'food' : 'custom',
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

    const result = await response.json()

    // Emit events for each food that was potentially updated
    // This triggers reactive cache invalidation across the app
    if (result.meal?.ingredients) {
      result.meal.ingredients.forEach((ing: any) => {
        if (ing.food_id) {
          emitEvent(EVENTS.FOOD_UPDATED, {
            foodId: ing.food_id,
            foodName: ing.food_name,
            macros: {
              calories: ing.calories,
              protein: ing.protein,
              carbs: ing.carbs,
              fat: ing.fat,
              fiber: ing.fiber,
            },
          })
        }
      })
    }

    // Also emit recipe event
    emitEvent(isEditing.value ? EVENTS.RECIPE_UPDATED : EVENTS.RECIPE_CREATED, {
      recipeId: result.meal.id,
      recipeName: result.meal.name,
    })

    $toast?.success(isEditing.value ? 'Recipe updated!' : 'Recipe created!')
    emit('save', result.meal)
  } catch (err) {
    console.error('Error saving recipe:', err)
    $toast?.error('Failed to save recipe')
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  form.value = { name: '', ingredients: [] }
  emit('cancel')
}

watch(
  () => props.recipe,
  newRecipe => {
    if (newRecipe) {
      // Deep copy to prevent mutations affecting parent
      form.value = {
        name: newRecipe.name || '',
        ingredients: newRecipe.ingredients?.map((ing: any) => ({ ...ing })) || [],
      }
    } else {
      form.value = { name: '', ingredients: [] }
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

      <div class="form-section">
        <label class="section-label">Ingredients</label>

        <div class="ingredient-search">
          <input
            v-model="ingredientSearch"
            type="text"
            placeholder="Search your foods..."
            class="form-input"
            @input="onSearchInput"
            @focus="onSearchFocus"
            @blur="onSearchBlur"
          />
          <div
            v-if="showDropdown && (filteredFoods.length > 0 || showAddCustomOption)"
            class="search-results"
          >
            <div
              v-for="result in filteredFoods"
              :key="result.id"
              class="search-result-item"
              @click="addIngredient(result)"
            >
              <span class="result-name">{{ result.name }}</span>
              <span v-if="result.brand" class="result-brand">{{ result.brand }}</span>
              <span class="result-cal">{{ result.calories || 0 }} cal</span>
            </div>
            <div
              v-if="showAddCustomOption"
              class="search-result-item add-custom"
              @click="addAsCustomIngredient"
            >
              <Icon name="mdi:plus" size="16" />
              <span class="result-name">Add "{{ ingredientSearch }}" as new food</span>
            </div>
          </div>
        </div>

        <div v-if="form.ingredients.length > 0" class="ingredients-list">
          <div v-for="(ing, index) in form.ingredients" :key="index" class="ingredient-item">
            <div class="ingredient-header" @click="toggleEditIngredient(index)">
              <div class="ingredient-info">
                <span class="ingredient-name">{{ ing.food_name }}</span>
                <div class="ingredient-macros">
                  <template
                    v-if="ing.calories > 0 || ing.protein > 0 || ing.carbs > 0 || ing.fat > 0"
                  >
                    {{ formatCalories(ing.calories * ing.servings) }} cal |
                    {{ formatMacro(ing.protein * ing.servings) }}g P |
                    {{ formatMacro(ing.carbs * ing.servings) }}g C |
                    {{ formatMacro(ing.fat * ing.servings) }}g F
                  </template>
                  <span v-else class="macro-hint">Click to view macros</span>
                </div>
              </div>
              <div class="ingredient-actions">
                <div class="servings-control">
                  <PortionInput
                    :model-value="ing.servings"
                    @update:model-value="val => updateIngredientServings(index, val)"
                  />
                </div>
                <button type="button" class="btn-icon" @click.stop="removeIngredient(index)">
                  <Icon name="mdi:close" size="16" />
                </button>
              </div>
            </div>

            <!-- Inline edit form - Name only (macros are read-only) -->
            <div v-if="editingIngredientIndex === index" class="ingredient-edit">
              <div class="edit-row">
                <div class="edit-field name-field">
                  <label>Name (read-only from food)</label>
                  <input
                    :value="ing.food_name"
                    type="text"
                    class="form-input"
                    disabled
                    title="Edit the food itself to change the name"
                  />
                </div>
              </div>
              <div class="edit-row macros-display">
                <div class="macro-display-item">
                  <label>Calories</label>
                  <span class="macro-value"
                    >{{ formatCalories(ing.calories * ing.servings) }} cal</span
                  >
                </div>
                <div class="macro-display-item">
                  <label>Protein</label>
                  <span class="macro-value">{{ formatMacro(ing.protein * ing.servings) }}g</span>
                </div>
                <div class="macro-display-item">
                  <label>Carbs</label>
                  <span class="macro-value">{{ formatMacro(ing.carbs * ing.servings) }}g</span>
                </div>
                <div class="macro-display-item">
                  <label>Fat</label>
                  <span class="macro-value">{{ formatMacro(ing.fat * ing.servings) }}g</span>
                </div>
              </div>
              <p class="edit-hint">
                <Icon name="mdi:information-outline" size="14" />
                To change macros, edit the food itself. Portions can be adjusted above.
              </p>
            </div>
          </div>
        </div>

        <div v-else class="no-ingredients">
          No ingredients added yet. Search for foods or add custom ingredients.
        </div>
      </div>

      <div class="macros-summary">
        <div class="macro-badge">
          <span class="macro-value">{{ formatCalories(calculatedMacros.calories) }}</span>
          <span class="macro-label">calories</span>
        </div>
        <div class="macro-badge protein">
          <span class="macro-value">{{ formatMacro(calculatedMacros.protein) }}g</span>
          <span class="macro-label">protein</span>
        </div>
        <div class="macro-badge carbs">
          <span class="macro-value">{{ formatMacro(calculatedMacros.carbs) }}g</span>
          <span class="macro-label">carbs</span>
        </div>
        <div class="macro-badge fat">
          <span class="macro-value">{{ formatMacro(calculatedMacros.fat) }}g</span>
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
  background: var(--color-bg);
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

.result-brand {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  margin-left: 8px;
}

.search-result-item.add-custom {
  color: var(--color-accent);
  font-weight: 500;
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
  padding-top: 12px;
}

.search-result-item.add-custom .result-name {
  color: var(--color-accent);
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
  background: var(--color-bg-elevated);
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.ingredient-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.ingredient-header:hover {
  background: var(--color-bg-hover);
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

.macro-hint {
  font-size: 0.6875rem;
  color: var(--color-accent);
  font-style: italic;
}

.ingredient-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.servings-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.servings-control :deep(.portion-input) {
  width: 70px;
  padding: 4px 28px 4px 8px;
  font-size: 0.8125rem;
  height: 32px;
}

.servings-control :deep(.step-btn) {
  width: 20px;
  height: 15px;
}

.ingredient-edit {
  padding: 12px;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.edit-row {
  margin-bottom: 12px;
}

.edit-row:last-child {
  margin-bottom: 0;
}

.edit-field {
  margin-bottom: 8px;
}

.edit-field label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.edit-field .form-input {
  padding: 8px 10px;
  font-size: 0.8125rem;
}

.macros-edit {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

/* New styles for read-only macro display */
.macros-display {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px;
  background: var(--color-bg-card);
  border-radius: 4px;
  margin-top: 8px;
}

.macro-display-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.macro-display-item label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.macro-display-item .macro-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.name-field input:disabled {
  background: var(--color-bg-elevated);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.edit-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px;
  background: var(--color-info-bg);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
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
