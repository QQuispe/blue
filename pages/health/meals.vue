<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import Card from '~/components/Card.vue'
import MacroCard from '~/components/health/MacroCard.vue'
import BaseButton from '~/components/BaseButton.vue'
import HealthSetupRequired from '~/components/health/HealthSetupRequired.vue'

const { $toast } = useNuxtApp()

const needsSetup = ref(false)
const isCheckingSetup = ref(true)

const checkSetup = async () => {
  try {
    const response = await $fetch('/api/health/setup-status', {
      credentials: 'include',
      ignoreResponseError: true,
    })
    needsSetup.value = !response?.isComplete
  } catch {
    needsSetup.value = true
  } finally {
    isCheckingSetup.value = false
  }
}

checkSetup()

const formatNumber = (num: any) => {
  if (num === null || num === undefined || typeof num !== 'number') return '0'
  return num.toFixed(0)
}

onMounted(async () => {
  await fetchUserSettings()
  selectedDate.value = getLocalDateString()
  fetchMeals()
  fetchTargetMacros()
})

interface MealFood {
  food_name: string
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Meal {
  id: number
  mealType: string
  mealDate: string
  name: string | null
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  foods: any[]
}

interface Food {
  fdcId?: number
  id?: number
  name: string
  brand: string | null
  servingSize: number
  servingUnit: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  ingredients?: string
}

const isLoading = ref(true)
const meals = ref<Meal[]>([])
const userTimezone = ref('America/Los_Angeles')

const fetchUserSettings = async () => {
  try {
    const res = await fetch('/api/user/settings', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      userTimezone.value = data.settings?.timezone || 'America/Los_Angeles'
    }
  } catch (err) {
    console.error('Failed to fetch settings:', err)
  }
}

const getLocalDateString = () => {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone.value,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const selectedDate = ref(getLocalDateString())
const savedMeals = ref<any[]>([])
const recentFoods = ref<any[]>([])
const customFoods = ref<any[]>([])
const activeTab = ref<'search' | 'saved' | 'recent' | 'custom'>('search')

const showAddMealModal = ref(false)
const showCreateRecipeModal = ref(false)
const showCreateFoodModal = ref(false)
const showEditRecipeModal = ref(false)
const showEditMealModal = ref(false)
const editingRecipe = ref<any>(null)
const editingMeal = ref<any>(null)
const editingMealFoods = ref<any[]>([])
const isAddingFood = ref(false)
const searchQuery = ref('')
const searchResults = ref<Food[]>([])
const selectedFoods = ref<MealFood[]>([])
const selectedMealType = ref<string>('breakfast')

const mealTypes = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

const todaysMacros = computed(() => {
  return meals.value.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.totalCalories,
      protein: acc.protein + meal.totalProtein,
      carbs: acc.carbs + meal.totalCarbs,
      fat: acc.fat + meal.totalFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
})

const targetMacros = ref({ calories: 2000, protein: 120, carbs: 200, fat: 65 })
const hasCustomTargets = ref(false)
const activeGoalId = ref<number | null>(null)

const showEditTargetsModal = ref(false)
const editTargets = ref({
  calories: 2000,
  protein: 120,
  carbs: 200,
  fat: 65,
})
const isSavingTargets = ref(false)

const remainingMacros = computed(() => ({
  calories: Math.max(0, targetMacros.value.calories - todaysMacros.value.calories),
  protein: Math.max(0, targetMacros.value.protein - todaysMacros.value.protein),
  carbs: Math.max(0, targetMacros.value.carbs - todaysMacros.value.carbs),
  fat: Math.max(0, targetMacros.value.fat - todaysMacros.value.fat),
}))

const macroProgress = computed(() => ({
  calories: Math.min(100, (todaysMacros.value.calories / targetMacros.value.calories) * 100),
  protein: Math.min(100, (todaysMacros.value.protein / targetMacros.value.protein) * 100),
  carbs: Math.min(100, (todaysMacros.value.carbs / targetMacros.value.carbs) * 100),
  fat: Math.min(100, (todaysMacros.value.fat / targetMacros.value.fat) * 100),
}))

const fetchMeals = async () => {
  try {
    isLoading.value = true
    const response = await fetch(`/api/health/meals?date=${selectedDate.value}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch meals')
    }

    const data = await response.json()
    meals.value = data.meals
  } catch (err: any) {
    console.error('Error:', err)
  } finally {
    isLoading.value = false
  }
}

const fetchSavedMeals = async () => {
  try {
    const response = await fetch('/api/health/saved-meals', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch saved meals')
    }

    const data = await response.json()
    savedMeals.value = data.meals || []
  } catch (err: any) {
    console.error('Error fetching saved meals:', err)
  }
}

const fetchRecentFoods = async () => {
  try {
    const response = await fetch('/api/health/foods/recent?limit=10', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch recent foods')
    }

    const data = await response.json()
    recentFoods.value = data.foods || []
  } catch (err: any) {
    console.error('Error fetching recent foods:', err)
  }
}

const fetchCustomFoods = async () => {
  try {
    const response = await fetch('/api/health/foods/custom', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch custom foods')
    }

    const data = await response.json()
    customFoods.value = data.foods || []
  } catch (err: any) {
    console.error('Error fetching custom foods:', err)
  }
}

const deleteSavedMeal = async (id: number) => {
  if (!confirm('Delete this recipe?')) return

  try {
    const response = await fetch(`/api/health/saved-meals/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to delete meal')
    }

    $toast.success('Recipe deleted')
    await fetchSavedMeals()
  } catch (err: any) {
    console.error('Error deleting meal:', err)
    $toast.error('Failed to delete recipe')
  }
}

const fetchTargetMacros = async () => {
  try {
    const response = await fetch('/api/health/dashboard', {
      credentials: 'include',
    })

    if (!response.ok) return

    const data = await response.json()

    if (data.dashboard?.targetMacros) {
      const tm = data.dashboard.targetMacros
      targetMacros.value = {
        calories: Number(tm.calories) || 2000,
        protein: Number(tm.protein) || 120,
        carbs: Number(tm.carbs) || 200,
        fat: Number(tm.fat) || 65,
      }
    }

    if (data.dashboard?.activeGoal) {
      activeGoalId.value = data.dashboard.activeGoal.id
      hasCustomTargets.value = !!(
        data.dashboard.activeGoal.targetCalories ||
        data.dashboard.activeGoal.targetProtein ||
        data.dashboard.activeGoal.targetCarbs ||
        data.dashboard.activeGoal.targetFat
      )
    }
  } catch (err: any) {
    console.error('Error fetching target macros:', err)
  }
}

const doSearch = async () => {
  try {
    const response = await fetch(
      `/api/health/foods/search?q=${encodeURIComponent(searchQuery.value)}`,
      {
        credentials: 'include',
      }
    )

    if (!response.ok) {
      throw new Error('Failed to search foods')
    }

    const data = await response.json()
    searchResults.value = data.foods || []
  } catch (err: any) {
    console.error('Search error:', err)
  }
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const searchFoods = () => {
  if (searchTimeout) clearTimeout(searchTimeout)

  if (!searchQuery.value || searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

  searchTimeout = setTimeout(doSearch, 300)
}

const addFood = (food: Food) => {
  selectedFoods.value.push({
    food_name: food.name,
    servings: 1,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
  })
  searchQuery.value = ''
  searchResults.value = []
}

const addRecentFood = (food: any) => {
  selectedFoods.value.push({
    food_name: food.food_name,
    servings: food.last_servings || 1,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
  })
  $toast.success('Added to meal')
}

const addCustomFood = (food: any) => {
  selectedFoods.value.push({
    food_name: food.name,
    servings: 1,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
  })
  $toast.success('Added to meal')
}

const openAddMealModal = async () => {
  await Promise.all([fetchSavedMeals(), fetchRecentFoods(), fetchCustomFoods()])
  showAddMealModal.value = true
}

const addSavedMeal = (meal: any) => {
  selectedFoods.value.push({
    food_name: meal.name,
    servings: 1,
    calories: meal.calories || 0,
    protein: meal.protein || 0,
    carbs: meal.carbs || 0,
    fat: meal.fat || 0,
  })
  $toast.success('Added to meal')
}

const newRecipe = ref({
  name: '',
  meal_type: 'lunch',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  instructions: '',
})

const editRecipe = ref({
  name: '',
  meal_type: 'lunch',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  instructions: '',
})

const newCustomFood = ref({
  name: '',
  brand: '',
  serving_size: '100',
  serving_unit: 'g',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
})

const isCreatingRecipe = ref(false)
const isCreatingFood = ref(false)
const isUpdatingRecipe = ref(false)

const openEditRecipe = (meal: any) => {
  editingRecipe.value = meal
  editRecipe.value = {
    name: meal.name,
    meal_type: meal.meal_type,
    calories: meal.calories?.toString() || '',
    protein: meal.protein?.toString() || '',
    carbs: meal.carbs?.toString() || '',
    fat: meal.fat?.toString() || '',
    instructions: meal.instructions || '',
  }
  showEditRecipeModal.value = true
}

const saveEditedRecipe = async () => {
  if (!editingRecipe.value) return
  if (!editRecipe.value.name) {
    $toast.error('Recipe name is required')
    return
  }

  try {
    isUpdatingRecipe.value = true
    const response = await fetch(`/api/health/saved-meals/${editingRecipe.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: editRecipe.value.name,
        meal_type: editRecipe.value.meal_type,
        calories: editRecipe.value.calories ? Number(editRecipe.value.calories) : null,
        protein: editRecipe.value.protein ? Number(editRecipe.value.protein) : null,
        carbs: editRecipe.value.carbs ? Number(editRecipe.value.carbs) : null,
        fat: editRecipe.value.fat ? Number(editRecipe.value.fat) : null,
        instructions: editRecipe.value.instructions || null,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to update recipe')
    }

    $toast.success('Recipe updated!')
    showEditRecipeModal.value = false
    editingRecipe.value = null
    await fetchSavedMeals()
  } catch (err: any) {
    console.error('Error updating recipe:', err)
    $toast.error('Failed to update recipe')
  } finally {
    isUpdatingRecipe.value = false
  }
}

const saveTargets = async () => {
  if (!activeGoalId.value) {
    $toast.error('No active goal found')
    return
  }

  try {
    isSavingTargets.value = true
    const response = await fetch(`/api/health/goals?id=${activeGoalId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        target_calories: editTargets.value.calories || null,
        target_protein: editTargets.value.protein || null,
        target_carbs: editTargets.value.carbs || null,
        target_fat: editTargets.value.fat || null,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save targets')
    }

    const data = await response.json()
    targetMacros.value = {
      calories: data.goal.targetCalories || editTargets.value.calories,
      protein: data.goal.targetProtein || editTargets.value.protein,
      carbs: data.goal.targetCarbs || editTargets.value.carbs,
      fat: data.goal.targetFat || editTargets.value.fat,
    }
    hasCustomTargets.value = true
    showEditTargetsModal.value = false
    $toast.success('Targets updated!')
  } catch (err: any) {
    console.error('Error saving targets:', err)
    $toast.error('Failed to save targets')
  } finally {
    isSavingTargets.value = false
  }
}

const openEditTargets = () => {
  editTargets.value = { ...targetMacros.value }
  showEditTargetsModal.value = true
}

const createRecipe = async () => {
  if (!newRecipe.value.name) {
    $toast.error('Recipe name is required')
    return
  }

  try {
    isCreatingRecipe.value = true
    const response = await fetch('/api/health/saved-meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: newRecipe.value.name,
        meal_type: newRecipe.value.meal_type,
        calories: newRecipe.value.calories ? Number(newRecipe.value.calories) : null,
        protein: newRecipe.value.protein ? Number(newRecipe.value.protein) : null,
        carbs: newRecipe.value.carbs ? Number(newRecipe.value.carbs) : null,
        fat: newRecipe.value.fat ? Number(newRecipe.value.fat) : null,
        instructions: newRecipe.value.instructions || null,
        source: 'custom',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create recipe')
    }

    $toast.success('Recipe created!')
    showCreateRecipeModal.value = false
    newRecipe.value = {
      name: '',
      meal_type: 'lunch',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      instructions: '',
    }
    await fetchSavedMeals()
  } catch (err: any) {
    console.error('Error creating recipe:', err)
    $toast.error('Failed to create recipe')
  } finally {
    isCreatingRecipe.value = false
  }
}

const createCustomFood = async () => {
  if (!newCustomFood.value.name) {
    $toast.error('Food name is required')
    return
  }

  try {
    isCreatingFood.value = true
    const response = await fetch('/api/health/foods/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: newCustomFood.value.name,
        brand: newCustomFood.value.brand || null,
        serving_size: newCustomFood.value.serving_size
          ? Number(newCustomFood.value.serving_size)
          : 100,
        serving_unit: newCustomFood.value.serving_unit || 'g',
        calories: newCustomFood.value.calories ? Number(newCustomFood.value.calories) : 0,
        protein: newCustomFood.value.protein ? Number(newCustomFood.value.protein) : 0,
        carbs: newCustomFood.value.carbs ? Number(newCustomFood.value.carbs) : 0,
        fat: newCustomFood.value.fat ? Number(newCustomFood.value.fat) : 0,
        fiber: newCustomFood.value.fiber ? Number(newCustomFood.value.fiber) : 0,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create food')
    }

    $toast.success('Food created!')
    showCreateFoodModal.value = false
    newCustomFood.value = {
      name: '',
      brand: '',
      serving_size: '100',
      serving_unit: 'g',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      fiber: '',
    }
    await fetchCustomFoods()
  } catch (err: any) {
    console.error('Error creating food:', err)
    $toast.error('Failed to create food')
  } finally {
    isCreatingFood.value = false
  }
}

const removeFood = (index: number) => {
  selectedFoods.value.splice(index, 1)
}

const updateFoodPortion = (index: number, servings: number) => {
  selectedFoods.value[index].servings = servings
}

const saveMeal = async () => {
  if (selectedFoods.value.length === 0) {
    $toast.error('Add at least one food')
    return
  }

  try {
    isAddingFood.value = true

    const response = await fetch('/api/health/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        meal_type: selectedMealType.value,
        meal_date: selectedDate.value,
        foods: selectedFoods.value,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save meal')
    }

    $toast.success('Meal logged!')
    showAddMealModal.value = false
    selectedFoods.value = []
    selectedMealType.value = 'breakfast'
    fetchMeals()
  } catch (err: any) {
    $toast.error('Failed to save meal')
  } finally {
    isAddingFood.value = false
  }
}

const openEditMealModal = (meal: any) => {
  editingMeal.value = meal
  editingMealFoods.value = meal.foods?.map((f: any) => ({ ...f })) || []
  showEditMealModal.value = true
}

const updateEditMealFood = (index: number, field: string, value: any) => {
  editingMealFoods.value[index][field] = value
}

const saveEditedMeal = async () => {
  if (!editingMeal.value) return

  const totals = editingMealFoods.value.reduce(
    (acc: any, food: any) => ({
      calories: acc.calories + (Number(food.calories) || 0) * (Number(food.servings) || 1),
      protein: acc.protein + (Number(food.protein) || 0) * (Number(food.servings) || 1),
      carbs: acc.carbs + (Number(food.carbs) || 0) * (Number(food.servings) || 1),
      fat: acc.fat + (Number(food.fat) || 0) * (Number(food.servings) || 1),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  try {
    const response = await fetch(`/api/health/meals?id=${editingMeal.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        meal_type: editingMeal.value.mealType,
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        foods: editingMealFoods.value.map(f => ({
          food_name: f.food_name,
          food_id: f.food_id,
          servings: f.servings,
          calories: (Number(f.calories) || 0) * (Number(f.servings) || 1),
          protein: (Number(f.protein) || 0) * (Number(f.servings) || 1),
          carbs: (Number(f.carbs) || 0) * (Number(f.servings) || 1),
          fat: (Number(f.fat) || 0) * (Number(f.servings) || 1),
        })),
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to update meal')
    }

    $toast.success('Meal updated!')
    showEditMealModal.value = false
    editingMeal.value = null
    fetchMeals()
  } catch (err: any) {
    console.error('Error updating meal:', err)
    $toast.error('Failed to update meal')
  }
}

const deleteMeal = async (mealId: number) => {
  try {
    const response = await fetch(`/api/health/meals?id=${mealId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to delete meal')
    }

    $toast.success('Meal deleted')
    fetchMeals()
  } catch (err: any) {
    $toast.error('Failed to delete meal')
  }
}
</script>

<template>
  <PageLayout title="Meal Tracker">
    <HealthSetupRequired v-if="needsSetup && !isCheckingSetup" feature="meal tracking" />

    <template v-else>
      <div class="page-actions">
        <input v-model="selectedDate" type="date" class="date-picker" @change="fetchMeals" />
        <BaseButton variant="primary" @click="openAddMealModal">
          <Icon name="mdi:plus" size="20" />
          Log Meal
        </BaseButton>
      </div>

      <!-- Daily Summary -->
      <Card class="summary-card">
        <div class="summary-header">
          <h3>Today's Progress</h3>
          <button class="edit-targets-btn" @click="openEditTargets">
            <Icon name="mdi:pencil" size="16" />
          </button>
        </div>
        <div class="progress-header">
          <span class="remaining">{{ remainingMacros.calories }} cal remaining</span>
          <span class="target">
            of {{ targetMacros.calories }}
            <span v-if="hasCustomTargets" class="custom-badge">Custom</span>
            <span v-else class="auto-badge">Auto</span>
          </span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: `${macroProgress.calories}%` }"></div>
        </div>
        <div class="summary-macros">
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
          <MacroCard
            label="Fat"
            :current="todaysMacros.fat"
            :target="targetMacros.fat"
            color="error"
          />
        </div>
      </Card>

      <!-- Loading -->
      <div v-if="isLoading" class="loading">Loading...</div>

      <!-- Meals List -->
      <div v-else class="meals-list">
        <Card v-for="meal in meals" :key="meal.id" class="meal-card">
          <div class="meal-header">
            <div>
              <span class="meal-type">{{ meal.mealType }}</span>
            </div>
            <div class="meal-actions">
              <button class="edit-btn" @click="openEditMealModal(meal)">
                <Icon name="mdi:pencil-outline" size="18" />
              </button>
              <button class="delete-btn" @click="deleteMeal(meal.id)">
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
          </div>

          <div class="meal-footer">
            <span>P: {{ formatNumber(meal.totalProtein) }}g</span>
            <span>C: {{ formatNumber(meal.totalCarbs) }}g</span>
            <span>F: {{ formatNumber(meal.totalFat) }}g</span>
            <span class="total">{{ formatNumber(meal.totalCalories) }} cal</span>
          </div>
        </Card>

        <div v-if="meals.length === 0" class="empty-state">
          <Icon name="mdi:food-off" size="48" />
          <p>No meals logged for this day</p>
          <BaseButton variant="primary" @click="openAddMealModal"> Log Your First Meal </BaseButton>
        </div>
      </div>

      <!-- Add Meal Modal -->
      <div v-if="showAddMealModal" class="modal-overlay" @click.self="showAddMealModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>Log Meal</h2>
            <button class="close-btn" @click="showAddMealModal = false">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Meal Type</label>
              <select v-model="selectedMealType">
                <option v-for="type in mealTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>

            <!-- Tabs -->
            <div class="tabs">
              <button
                class="tab"
                :class="{ active: activeTab === 'search' }"
                @click="activeTab = 'search'"
              >
                Search Foods
              </button>
              <button
                class="tab"
                :class="{ active: activeTab === 'saved' }"
                @click="activeTab = 'saved'"
              >
                Recipes
              </button>
              <button
                class="tab"
                :class="{ active: activeTab === 'recent' }"
                @click="activeTab = 'recent'"
              >
                Recent
              </button>
              <button
                class="tab"
                :class="{ active: activeTab === 'custom' }"
                @click="activeTab = 'custom'"
              >
                My Foods
              </button>
            </div>

            <!-- Search Tab -->
            <div v-if="activeTab === 'search'" class="tab-content">
              <div class="form-group">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search foods..."
                  @input="searchFoods"
                />
                <div v-if="searchResults.length" class="search-results">
                  <div
                    v-for="food in searchResults"
                    :key="food.fdcId || food.id"
                    class="search-result"
                    @click="addFood(food)"
                  >
                    <div class="result-main">
                      <span class="result-name">{{ food.name }}</span>
                      <span class="result-serving"
                        >{{ food.servingSize }}{{ food.servingUnit }} per serving</span
                      >
                    </div>
                    <div class="result-macros">
                      <span class="result-cal">{{ food.calories }} cal</span>
                      <span class="result-macro">P: {{ food.protein }}g</span>
                      <span class="result-macro">C: {{ food.carbs }}g</span>
                      <span class="result-macro">F: {{ food.fat }}g</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Saved Meals Tab -->
            <div v-if="activeTab === 'saved'" class="tab-content">
              <div class="saved-header">
                <BaseButton variant="secondary" size="sm" @click="showCreateRecipeModal = true">
                  <Icon name="mdi:plus" size="16" />
                  Create Recipe
                </BaseButton>
              </div>
              <div v-if="savedMeals.length === 0" class="empty-state">
                <p>No saved meals yet.</p>
                <p class="hint">Generate a meal plan or create custom recipes to see them here.</p>
              </div>
              <div v-else class="saved-meals-list">
                <div
                  v-for="meal in savedMeals"
                  :key="meal.id"
                  class="saved-meal-item"
                  @click="addSavedMeal(meal)"
                >
                  <div class="meal-info">
                    <span class="meal-name">{{ meal.name }}</span>
                    <span class="meal-type">{{ meal.meal_type }}</span>
                  </div>
                  <div class="meal-macros">
                    <span>{{ meal.calories }} cal</span>
                    <span class="macro">P: {{ meal.protein }}g</span>
                    <span class="macro">C: {{ meal.carbs }}g</span>
                    <span class="macro">F: {{ meal.fat }}g</span>
                  </div>
                  <button class="edit-meal-btn" @click.stop="openEditRecipe(meal)">
                    <Icon name="mdi:pencil-outline" size="16" />
                  </button>
                  <button class="delete-meal-btn" @click.stop="deleteSavedMeal(meal.id)">
                    <Icon name="mdi:delete-outline" size="16" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Recent Tab -->
            <div v-if="activeTab === 'recent'" class="tab-content">
              <div v-if="recentFoods.length === 0" class="empty-state">
                <p>No recent foods.</p>
                <p class="hint">Foods you log will appear here for quick access.</p>
              </div>
              <div v-else class="recent-foods-list">
                <div
                  v-for="food in recentFoods"
                  :key="food.food_name"
                  class="recent-food-item"
                  @click="addRecentFood(food)"
                >
                  <div class="food-info">
                    <span class="food-name">{{ food.food_name }}</span>
                    <span class="food-meta">{{ food.meal_type }}</span>
                  </div>
                  <div class="food-macros">
                    <span>{{ food.calories }} cal/serving</span>
                    <span class="macro">P: {{ food.protein }}g</span>
                    <span class="macro">C: {{ food.carbs }}g</span>
                    <span class="macro">F: {{ food.fat }}g</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- My Foods Tab -->
            <div v-if="activeTab === 'custom'" class="tab-content">
              <div class="saved-header">
                <BaseButton variant="secondary" size="sm" @click="showCreateFoodModal = true">
                  <Icon name="mdi:plus" size="16" />
                  Add Food
                </BaseButton>
              </div>
              <div v-if="customFoods.length === 0" class="empty-state">
                <p>No custom foods yet.</p>
                <p class="hint">Add your own foods for quick logging.</p>
              </div>
              <div v-else class="recent-foods-list">
                <div
                  v-for="food in customFoods"
                  :key="food.id"
                  class="recent-food-item"
                  @click="addCustomFood(food)"
                >
                  <div class="food-info">
                    <span class="food-name">{{ food.name }}</span>
                    <span class="food-meta"
                      >{{ food.serving_size }}{{ food.serving_unit }} per serving</span
                    >
                  </div>
                  <div class="food-macros">
                    <span>{{ food.calories }} cal</span>
                    <span class="macro">P: {{ food.protein }}g</span>
                    <span class="macro">C: {{ food.carbs }}g</span>
                    <span class="macro">F: {{ food.fat }}g</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedFoods.length" class="selected-foods">
              <h4>Selected Foods</h4>
              <div v-for="(food, index) in selectedFoods" :key="index" class="selected-item">
                <span>{{ food.food_name }}</span>
                <div class="portion-controls">
                  <input
                    type="number"
                    v-model.number="food.servings"
                    min="0.25"
                    step="0.25"
                    class="portion-input"
                    @change="updateFoodPortion(index, food.servings)"
                  />
                  <span>x {{ (food.calories * food.servings).toFixed(0) }} cal</span>
                </div>
                <button class="remove-btn" @click="removeFood(index)">
                  <Icon name="mdi:close" size="16" />
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showAddMealModal = false">Cancel</BaseButton>
            <BaseButton
              variant="primary"
              @click="saveMeal"
              :disabled="isAddingFood || selectedFoods.length === 0"
            >
              {{ isAddingFood ? 'Saving...' : 'Save Meal' }}
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Create Recipe Modal -->
      <div
        v-if="showCreateRecipeModal"
        class="modal-overlay"
        @click.self="showCreateRecipeModal = false"
      >
        <div class="modal">
          <div class="modal-header">
            <h2>Create Custom Recipe</h2>
            <button class="close-btn" @click="showCreateRecipeModal = false">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Recipe Name *</label>
              <input v-model="newRecipe.name" type="text" placeholder="e.g., My Chicken Salad" />
            </div>

            <div class="form-group">
              <label>Meal Type</label>
              <select v-model="newRecipe.meal_type">
                <option v-for="type in mealTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Calories</label>
                <input v-model="newRecipe.calories" type="number" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Protein (g)</label>
                <input v-model="newRecipe.protein" type="number" placeholder="0" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Carbs (g)</label>
                <input v-model="newRecipe.carbs" type="number" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Fat (g)</label>
                <input v-model="newRecipe.fat" type="number" placeholder="0" />
              </div>
            </div>

            <div class="form-group">
              <label>Instructions (optional)</label>
              <textarea
                v-model="newRecipe.instructions"
                placeholder="How to prepare..."
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showCreateRecipeModal = false"
              >Cancel</BaseButton
            >
            <BaseButton
              variant="primary"
              @click="createRecipe"
              :disabled="isCreatingRecipe || !newRecipe.name"
            >
              {{ isCreatingRecipe ? 'Creating...' : 'Create Recipe' }}
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Edit Recipe Modal -->
      <div
        v-if="showEditRecipeModal"
        class="modal-overlay"
        @click.self="showEditRecipeModal = false"
      >
        <div class="modal">
          <div class="modal-header">
            <h2>Edit Recipe</h2>
            <button class="close-btn" @click="showEditRecipeModal = false">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Recipe Name *</label>
              <input v-model="editRecipe.name" type="text" placeholder="e.g., My Chicken Salad" />
            </div>

            <div class="form-group">
              <label>Meal Type</label>
              <select v-model="editRecipe.meal_type">
                <option v-for="type in mealTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Calories</label>
                <input v-model="editRecipe.calories" type="number" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Protein (g)</label>
                <input v-model="editRecipe.protein" type="number" placeholder="0" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Carbs (g)</label>
                <input v-model="editRecipe.carbs" type="number" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Fat (g)</label>
                <input v-model="editRecipe.fat" type="number" placeholder="0" />
              </div>
            </div>

            <div class="form-group">
              <label>Instructions (optional)</label>
              <textarea
                v-model="editRecipe.instructions"
                placeholder="How to prepare..."
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showEditRecipeModal = false">Cancel</BaseButton>
            <BaseButton
              variant="primary"
              @click="saveEditedRecipe"
              :disabled="isUpdatingRecipe || !editRecipe.name"
            >
              {{ isUpdatingRecipe ? 'Saving...' : 'Save Changes' }}
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Create Custom Food Modal -->
      <div
        v-if="showCreateFoodModal"
        class="modal-overlay"
        @click.self="showCreateFoodModal = false"
      >
        <div class="modal">
          <div class="modal-header">
            <h2>Add Custom Food</h2>
            <button class="close-btn" @click="showCreateFoodModal = false">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Name *</label>
              <input v-model="newCustomFood.name" type="text" placeholder="e.g., Kirkland Eggs" />
            </div>
            <div class="form-group">
              <label>Brand</label>
              <input v-model="newCustomFood.brand" type="text" placeholder="e.g., Kirkland" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Serving Size</label>
                <input v-model="newCustomFood.serving_size" type="number" placeholder="100" />
              </div>
              <div class="form-group">
                <label>Unit</label>
                <select v-model="newCustomFood.serving_unit">
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="oz">oz</option>
                  <option value="cup">cup</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="piece">piece</option>
                  <option value="serving">serving</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Calories</label>
                <input v-model="newCustomFood.calories" type="number" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Protein (g)</label>
                <input v-model="newCustomFood.protein" type="number" placeholder="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Carbs (g)</label>
                <input v-model="newCustomFood.carbs" type="number" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Fat (g)</label>
                <input v-model="newCustomFood.fat" type="number" placeholder="0" />
              </div>
            </div>
            <div class="form-group">
              <label>Fiber (g)</label>
              <input v-model="newCustomFood.fiber" type="number" placeholder="0" />
            </div>
          </div>

          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showCreateFoodModal = false">Cancel</BaseButton>
            <BaseButton
              variant="primary"
              @click="createCustomFood"
              :disabled="isCreatingFood || !newCustomFood.name"
            >
              {{ isCreatingFood ? 'Creating...' : 'Add Food' }}
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Edit Meal Modal -->
      <div v-if="showEditMealModal" class="modal-overlay" @click.self="showEditMealModal = false">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h2>Edit Meal</h2>
            <button class="close-btn" @click="showEditMealModal = false">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Meal Type</label>
              <select v-model="editingMeal.mealType">
                <option v-for="type in mealTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Foods</label>
              <div class="edit-foods-list">
                <div v-for="(food, index) in editingMealFoods" :key="index" class="edit-food-item">
                  <span class="food-name">{{ food.food_name }}</span>
                  <div class="food-edit-controls">
                    <input
                      type="number"
                      :value="food.servings"
                      @input="
                        updateEditMealFood(
                          index,
                          'servings',
                          ($event.target as HTMLInputElement).value
                        )
                      "
                      min="0.25"
                      step="0.25"
                      class="portion-input"
                    />
                    <span>x</span>
                    <span
                      >{{
                        Math.round((Number(food.calories) || 0) * (Number(food.servings) || 1))
                      }}
                      cal</span
                    >
                    <span
                      >P:
                      {{
                        Math.round((Number(food.protein) || 0) * (Number(food.servings) || 1))
                      }}g</span
                    >
                    <span
                      >C:
                      {{
                        Math.round((Number(food.carbs) || 0) * (Number(food.servings) || 1))
                      }}g</span
                    >
                    <span
                      >F:
                      {{
                        Math.round((Number(food.fat) || 0) * (Number(food.servings) || 1))
                      }}g</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showEditMealModal = false">Cancel</BaseButton>
            <BaseButton variant="primary" @click="saveEditedMeal"> Save Changes </BaseButton>
          </div>
        </div>
      </div>

      <!-- Edit Targets Modal -->
      <div
        v-if="showEditTargetsModal"
        class="modal-overlay"
        @click.self="showEditTargetsModal = false"
      >
        <div class="modal">
          <div class="modal-header">
            <h2>Edit Daily Targets</h2>
            <button class="close-btn" @click="showEditTargetsModal = false">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <div class="modal-body">
            <p class="modal-description">
              Override your auto-calculated targets. Leave blank to use calculated values.
            </p>

            <div class="form-row">
              <div class="form-group">
                <label>Calories</label>
                <input v-model.number="editTargets.calories" type="number" placeholder="2000" />
              </div>
              <div class="form-group">
                <label>Protein (g)</label>
                <input v-model.number="editTargets.protein" type="number" placeholder="120" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Carbs (g)</label>
                <input v-model.number="editTargets.carbs" type="number" placeholder="200" />
              </div>
              <div class="form-group">
                <label>Fat (g)</label>
                <input v-model.number="editTargets.fat" type="number" placeholder="65" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showEditTargetsModal = false"
              >Cancel</BaseButton
            >
            <BaseButton variant="primary" @click="saveTargets" :disabled="isSavingTargets">
              {{ isSavingTargets ? 'Saving...' : 'Save Targets' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </template>
  </PageLayout>
</template>

<style scoped>
.page-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.date-picker {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  height: 40px;
  width: 150px;
}

.summary-card {
  margin-bottom: 24px;
}

.summary-card h3 {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.edit-targets-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.edit-targets-btn:hover {
  background: var(--color-bg-elevated);
  color: var(--color-accent);
}

.custom-badge,
.auto-badge {
  font-size: 0.625rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
}

.custom-badge {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.auto-badge {
  background: var(--color-bg-elevated);
  color: var(--color-text-muted);
}

.modal-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.875rem;
}

.progress-header .remaining {
  font-weight: 600;
  color: var(--color-accent);
}

.progress-header .target {
  color: var(--color-text-muted);
}

.progress-bar-container {
  height: 8px;
  background: var(--color-bg-elevated);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-bar {
  height: 100%;
  background: var(--color-accent);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.summary-macros {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
}

.meals-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.meal-card {
  margin-bottom: 0;
}

.meal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.meal-type {
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: capitalize;
  margin-right: 12px;
}

.meal-time {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.meal-actions {
  display: flex;
  gap: 4px;
}

.edit-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
}

.edit-btn:hover {
  color: var(--color-accent);
}

.delete-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
}

.delete-btn:hover {
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
  gap: 12px;
  padding: 8px 12px;
  background: var(--color-bg-elevated);
  border-radius: 6px;
}

.food-name {
  flex: 1;
  color: var(--color-text-primary);
}

.food-portion {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.food-calories {
  color: var(--color-accent);
  font-size: 0.875rem;
  font-weight: 500;
}

.meal-footer {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.meal-footer .total {
  margin-left: auto;
  color: var(--color-text-primary);
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px;
  color: var(--color-text-muted);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-card);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-lg {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 1.25rem;
  color: var(--color-text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 1rem;
}

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

.search-results {
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.search-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
}

.search-result:last-child {
  border-bottom: none;
}

.search-result:hover {
  background: var(--color-bg-elevated);
}

.result-name {
  flex: 1;
  color: var(--color-text-primary);
  font-weight: 500;
}

.result-serving {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.result-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-macros {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.result-macro {
  color: var(--color-text-muted);
}

.result-info {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.result-cal {
  font-size: 0.875rem;
  color: var(--color-accent);
}

.selected-foods {
  margin-top: 20px;
}

.selected-foods h4 {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-elevated);
  border-radius: 8px;
  margin-bottom: 8px;
}

.portion-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.portion-input {
  width: 60px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  text-align: center;
}

.remove-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.remove-btn:hover {
  color: var(--color-error);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--color-border);
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 10px 16px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.tab:hover {
  border-color: var(--color-accent);
}

.tab.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg-primary);
}

.tab-content {
  margin-bottom: 16px;
}

.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--color-text-secondary);
}

.empty-state .hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-top: 8px;
}

.saved-meals-list {
  max-height: 300px;
  overflow-y: auto;
}

.recent-foods-list {
  max-height: 300px;
  overflow-y: auto;
}

.recent-food-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.recent-food-item:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-hover);
}

.food-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.food-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.food-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.food-macros {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.saved-meal-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.saved-meal-item:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-hover);
}

.delete-meal-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s;
}

.edit-meal-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s;
}

.saved-meal-item:hover .delete-meal-btn,
.saved-meal-item:hover .edit-meal-btn {
  opacity: 1;
}

.delete-meal-btn:hover {
  color: var(--color-error);
  background: var(--color-bg-hover);
}

.meal-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meal-name {
  font-weight: 500;
}

.meal-type {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.meal-macros {
  display: flex;
  gap: 12px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.meal-macros .macro {
  color: var(--color-text-muted);
}

.saved-header {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

textarea {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-family: inherit;
  resize: vertical;
}

textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}
</style>
