<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
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
  fetchSavedMeals()
  fetchRecentFoods()
  fetchCustomFoods()
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

const groupedMeals = computed(() => {
  const groups: Record<string, { meal: Meal; ids: number[] }> = {}

  for (const meal of meals.value) {
    const type = meal.mealType
    if (!groups[type]) {
      groups[type] = {
        meal: {
          id: meal.id,
          mealType: type,
          mealDate: meal.mealDate,
          name: meal.name,
          notes: meal.notes,
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          foods: [],
          createdAt: meal.createdAt,
        },
        ids: [],
      }
    }
    groups[type].meal.totalCalories += meal.totalCalories
    groups[type].meal.totalProtein += meal.totalProtein
    groups[type].meal.totalCarbs += meal.totalCarbs
    groups[type].meal.totalFat += meal.totalFat

    const foodsWithMealId = meal.foods.map((f: any) => ({ ...f, _mealId: meal.id }))
    groups[type].meal.foods.push(...foodsWithMealId)
    groups[type].ids.push(meal.id)
  }

  return Object.values(groups).map(g => ({ ...g.meal, mealIds: g.ids }))
})

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

const getYesterdayDate = () => {
  const now = new Date()
  now.setDate(now.getDate() - 1)
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
const activeTab = ref<'recent' | 'myFoods' | 'search'>('recent')

const myFoods = computed(() => {
  const recipes = savedMeals.value.map(m => ({
    id: m.id,
    name: m.name,
    type: 'recipe',
    meal_type: m.meal_type,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    serving_size: m.calories ? 1 : null,
    serving_unit: 'serving',
    instructions: m.instructions,
    ingredients: m.ingredients,
  }))
  const foods = customFoods.value.map(f => ({
    id: f.id,
    name: f.name,
    type: 'food',
    meal_type: null,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    serving_size: f.serving_size,
    serving_unit: f.serving_unit,
    instructions: null,
  }))
  return [...recipes, ...foods]
})

const filteredMyFoods = computed(() => {
  const search = myFoodsSearchDebounced.value.toLowerCase().trim()
  if (!search) return myFoods.value
  return myFoods.value.filter(food => food.name.toLowerCase().includes(search))
})

const showAddMealModal = ref(false)
const showCreateRecipeModal = ref(false)
const showCreateFoodModal = ref(false)
const showEditRecipeModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteConfirmItem = ref<{ id: number; type: 'recipe' | 'food' } | null>(null)
const showEditMealModal = ref(false)
const editingRecipe = ref<any>(null)
const editingFood = ref<any>(null)
const editingMeal = ref<any>(null)
const editingMealFoods = ref<any[]>([])
const isAddingFood = ref(false)
const searchQuery = ref('')
const searchResults = ref<Food[]>([])
const myFoodsSearch = ref('')
const myFoodsSearchDebounced = ref('')
const selectedFoods = ref<MealFood[]>([])
const selectedMealType = ref<string>('breakfast')

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(myFoodsSearch, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    myFoodsSearchDebounced.value = myFoodsSearch.value
  }, 300)
})

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

const copyMealFromYesterday = async (mealType: string) => {
  const yesterday = getYesterdayDate()
  try {
    const response = await fetch(`/api/health/meals?date=${yesterday}`, {
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to fetch yesterday meals')
    const data = await response.json()
    const yesterdayMeal = data.meals?.find((m: any) => m.mealType === mealType)

    if (!yesterdayMeal) {
      $toast.info(`No ${mealType} logged yesterday`)
      return
    }

    const newMealResponse = await fetch('/api/health/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        meal_type: mealType,
        meal_date: selectedDate.value,
        foods: yesterdayMeal.foods,
      }),
    })

    if (!newMealResponse.ok) throw new Error('Failed to copy meal')

    $toast.success(`Copied ${mealType} from yesterday`)
    fetchMeals()
  } catch (err: any) {
    console.error('Error copying meal:', err)
    $toast.error('Failed to copy meal')
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
  deleteConfirmItem.value = { id, type: 'recipe' }
  showDeleteConfirmModal.value = true
}

const confirmDelete = async () => {
  if (!deleteConfirmItem.value) return

  try {
    if (deleteConfirmItem.value.type === 'recipe') {
      await $fetch(`/api/health/saved-meals/${deleteConfirmItem.value.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      $toast.success('Recipe deleted')
      await fetchSavedMeals()
    } else if (deleteConfirmItem.value.type === 'food') {
      await $fetch(`/api/health/foods/custom/${deleteConfirmItem.value.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      $toast.success('Food deleted')
      await fetchCustomFoods()
    }
  } catch (err: any) {
    console.error('Error deleting:', err)
    $toast.error('Failed to delete')
  } finally {
    showDeleteConfirmModal.value = false
    deleteConfirmItem.value = null
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

const addMyFood = (food: any) => {
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

const openEditMyFood = (food: any) => {
  if (food.type === 'recipe') {
    openEditRecipe(food)
  } else {
    openEditCustomFood(food)
  }
}

const deleteMyFood = async (food: any) => {
  if (food.type === 'recipe') {
    deleteConfirmItem.value = { id: food.id, type: 'recipe' }
    showDeleteConfirmModal.value = true
  } else {
    deleteConfirmItem.value = { id: food.id, type: 'food' }
    showDeleteConfirmModal.value = true
  }
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

interface RecipeIngredient {
  type: 'food' | 'custom' | 'recipe'
  food_id?: number
  recipe_id?: number
  food_name: string
  servings: number
  serving_size?: number
  serving_unit?: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

const newRecipe = ref({
  name: '',
  meal_type: 'lunch',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  instructions: '',
  ingredients: [] as RecipeIngredient[],
})

const editRecipe = ref({
  name: '',
  meal_type: 'lunch',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  instructions: '',
  ingredients: [] as RecipeIngredient[],
})

const recipeIngredientSearch = ref('')
const recipeIngredientResults = ref<{ foods: any[]; recipes: any[] }>({ foods: [], recipes: [] })
const isSearchingIngredients = ref(false)
const showCustomIngredientForm = ref(false)
const newCustomIngredient = ref({
  food_name: '',
  servings: '1',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
})

const searchRecipeIngredients = async () => {
  const query = recipeIngredientSearch.value.trim()
  if (!query || query.length < 1) {
    recipeIngredientResults.value = { foods: [], recipes: [] }
    return
  }

  isSearchingIngredients.value = true
  try {
    const response = await fetch(`/api/health/ingredients/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    })
    if (response.ok) {
      const data = await response.json()
      recipeIngredientResults.value = data
    }
  } catch (err) {
    console.error('Error searching ingredients:', err)
  } finally {
    isSearchingIngredients.value = false
  }
}

let ingredientSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(recipeIngredientSearch, () => {
  if (ingredientSearchTimer) clearTimeout(ingredientSearchTimer)
  ingredientSearchTimer = setTimeout(() => {
    searchRecipeIngredients()
  }, 300)
})

const addIngredientToRecipe = (
  ingredient: any,
  recipe: 'new' | 'edit',
  targetList: RecipeIngredient[]
) => {
  const newIngredient: RecipeIngredient = {
    type: ingredient.type,
    food_id: ingredient.type === 'food' ? ingredient.id : undefined,
    recipe_id: ingredient.type === 'recipe' ? ingredient.id : undefined,
    food_name: ingredient.name,
    servings: ingredient.serving_size || 1,
    serving_size: ingredient.serving_size,
    serving_unit: ingredient.serving_unit,
    calories: ingredient.calories,
    protein: ingredient.protein,
    carbs: ingredient.carbs,
    fat: ingredient.fat,
  }
  targetList.push(newIngredient)
  recipeIngredientSearch.value = ''
  recipeIngredientResults.value = { foods: [], recipes: [] }
}

const addCustomFromSearch = (recipe: 'new' | 'edit', targetList: RecipeIngredient[]) => {
  newCustomIngredient.value.food_name = recipeIngredientSearch.value
  showCustomIngredientForm.value = true
}

const addCustomIngredientToRecipe = (recipe: 'new' | 'edit', targetList: RecipeIngredient[]) => {
  if (!newCustomIngredient.value.food_name) return

  const ingredient: RecipeIngredient = {
    type: 'custom',
    food_name: newCustomIngredient.value.food_name,
    servings: Number(newCustomIngredient.value.servings) || 1,
    calories: Number(newCustomIngredient.value.calories) || 0,
    protein: Number(newCustomIngredient.value.protein) || 0,
    carbs: Number(newCustomIngredient.value.carbs) || 0,
    fat: Number(newCustomIngredient.value.fat) || 0,
  }
  targetList.push(ingredient)

  newCustomIngredient.value = {
    food_name: '',
    servings: '1',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  }
  showCustomIngredientForm.value = false
}

const removeIngredientFromRecipe = (index: number, targetList: RecipeIngredient[]) => {
  targetList.splice(index, 1)
}

const calculatedRecipeMacros = (ingredients: RecipeIngredient[]) => {
  return ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories || 0) * (ing.servings || 1),
      protein: acc.protein + (ing.protein || 0) * (ing.servings || 1),
      carbs: acc.carbs + (ing.carbs || 0) * (ing.servings || 1),
      fat: acc.fat + (ing.fat || 0) * (ing.servings || 1),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

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
    ingredients: meal.ingredients || [],
  }
  showEditRecipeModal.value = true
}

const saveEditedRecipe = async () => {
  console.log('saveEditedRecipe CALLED')
  if (!editingRecipe.value) return
  if (!editRecipe.value.name) {
    $toast.error('Recipe name is required')
    return
  }

  try {
    isUpdatingRecipe.value = true
    const baseUrl = window.location.origin
    console.log('Saving recipe, ingredients:', editRecipe.value.ingredients)
    const macros = calculatedRecipeMacros(editRecipe.value.ingredients)
    const response = await fetch(`${baseUrl}/api/health/saved-meals/${editingRecipe.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: editRecipe.value.name,
        meal_type: editRecipe.value.meal_type,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        instructions: editRecipe.value.instructions || null,
        ingredients: editRecipe.value.ingredients,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to update recipe')
    }

    $toast.success('Recipe updated!')
    showEditRecipeModal.value = false
    editingRecipe.value = null
    editRecipe.value.ingredients = []
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
    const response = await fetch(`/api/health/goals/${activeGoalId.value}`, {
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
    const macros = calculatedRecipeMacros(newRecipe.value.ingredients)
    const response = await fetch('/api/health/saved-meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: newRecipe.value.name,
        meal_type: newRecipe.value.meal_type,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        instructions: newRecipe.value.instructions || null,
        source: 'custom',
        ingredients: newRecipe.value.ingredients,
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
      ingredients: [],
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
    editingFood.value = null
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

const deleteCustomFood = async (id: number) => {
  try {
    await $fetch(`/api/health/foods/custom/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    $toast.success('Food deleted')
    fetchCustomFoods()
  } catch (err: any) {
    console.error('Error deleting food:', err)
    $toast.error('Failed to delete food')
  }
}

const openEditCustomFood = (food: any) => {
  editingFood.value = food
  newCustomFood.value = {
    name: food.name,
    brand: food.brand || '',
    serving_size: food.serving_size?.toString() || '100',
    serving_unit: food.serving_unit || 'g',
    calories: food.calories?.toString() || '',
    protein: food.protein?.toString() || '',
    carbs: food.carbs?.toString() || '',
    fat: food.fat?.toString() || '',
    fiber: food.fiber?.toString() || '',
  }
  showCreateFoodModal.value = true
}

const saveEditedCustomFood = async () => {
  if (!editingFood.value) return
  if (!newCustomFood.value.name) {
    $toast.error('Food name is required')
    return
  }

  try {
    isCreatingFood.value = true
    const response = await fetch(`/api/health/foods/custom/${editingFood.value.id}`, {
      method: 'PUT',
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

    if (!response.ok) throw new Error('Failed to update food')

    $toast.success('Food updated')
    showCreateFoodModal.value = false
    editingFood.value = null
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
    fetchCustomFoods()
  } catch (err: any) {
    console.error('Error updating food:', err)
    $toast.error('Failed to update food')
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

const removeFoodFromEditMeal = (index: number) => {
  editingMealFoods.value.splice(index, 1)
}

const moveFoodFromEditMeal = async (index: number, newMealType: string, food: any) => {
  if (!editingMeal.value || !newMealType) return

  try {
    const targetMeal = meals.value.find(
      (m: any) => m.mealType === newMealType && m.mealDate === editingMeal.value.mealDate
    )

    const foodData = {
      food_name: food.food_name,
      food_id: food.food_id,
      servings: food.servings,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    }

    if (targetMeal) {
      await $fetch(`/api/health/meals/${targetMeal.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: {
          meal_type: targetMeal.mealType,
          meal_date: targetMeal.mealDate,
          total_calories: targetMeal.totalCalories + food.calories,
          total_protein: targetMeal.totalProtein + food.protein,
          total_carbs: targetMeal.totalCarbs + food.carbs,
          total_fat: targetMeal.totalFat + food.fat,
          foods: [...(targetMeal.foods || []), foodData],
        },
      })
    } else {
      await $fetch('/api/health/meals', {
        method: 'POST',
        credentials: 'include',
        body: {
          meal_type: newMealType,
          meal_date: editingMeal.value.mealDate,
          foods: [foodData],
        },
      })
    }

    editingMealFoods.value.splice(index, 1)
    $toast.success(`Moved to ${newMealType}`)
    fetchMeals()
  } catch (err: any) {
    console.error('Failed to move food:', err)
    $toast.error('Failed to move food')
  }
}

const handleMoveFoodInEdit = (index: number, event: Event) => {
  const target = event.target as HTMLSelectElement
  moveFoodFromEditMeal(index, target.value, editingMealFoods.value[index])
  showMoveFoodMenu.value = null
}

const handleMoveFoodButtonClick = (index: number, newMealType: string, food: any) => {
  moveFoodFromEditMeal(index, newMealType, food)
  showMoveFoodMenu.value = null
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
    const response = await $fetch(`/api/health/meals/${editingMeal.value.id}`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        meal_type: editingMeal.value.mealType,
        meal_date: editingMeal.value.mealDate,
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
      },
    })

    $toast.success('Meal updated!')
    showEditMealModal.value = false
    editingMeal.value = null
    fetchMeals()
  } catch (err: any) {
    console.error('Error updating meal:', err)
    $toast.error('Failed to update meal')
  }
}

const deleteMeal = async (meal: any) => {
  const idsToDelete = meal.mealIds || [meal.id]

  try {
    for (const id of idsToDelete) {
      await $fetch(`/api/health/meals/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
    }

    $toast.success('Meal deleted')
    fetchMeals()
  } catch (err: any) {
    $toast.error('Failed to delete meal')
  }
}

const deleteFoodFromMeal = async (food: any, mealType: string) => {
  const mealFoodId = food.id

  try {
    await $fetch(`/api/health/meal-foods/${mealFoodId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    $toast.success('Food removed')
    fetchMeals()
  } catch (err: any) {
    console.error('Error deleting food:', err)
    $toast.error('Failed to remove food')
  }
}

const changeMealType = async (meal: any, newMealType: string) => {
  try {
    await $fetch(`/api/health/meals/${meal.id}`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        meal_type: newMealType,
        total_calories: meal.totalCalories,
        total_protein: meal.totalProtein,
        total_carbs: meal.totalCarbs,
        total_fat: meal.totalFat,
        foods:
          meal.foods?.map((f: any) => ({
            food_name: f.food_name,
            food_id: f.food_id,
            servings: f.servings,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
          })) || [],
      },
    })

    $toast.success(`Moved to ${newMealType}`)
    fetchMeals()
  } catch (err: any) {
    console.error('Error changing meal type:', err)
    $toast.error('Failed to move meal')
  }
}

const moveFoodToMeal = async (food: any, currentMeal: any, newMealType: string) => {
  try {
    // Find if there's an existing meal of the target type on this date
    const targetMeal = meals.value.find(
      (m: any) => m.mealType === newMealType && m.mealDate === currentMeal.mealDate
    )

    if (targetMeal) {
      // Add food to existing meal
      await $fetch(`/api/health/meals/${targetMeal.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: {
          meal_type: targetMeal.mealType,
          meal_date: targetMeal.mealDate,
          total_calories: targetMeal.totalCalories + food.calories,
          total_protein: targetMeal.totalProtein + food.protein,
          total_carbs: targetMeal.totalCarbs + food.carbs,
          total_fat: targetMeal.totalFat + food.fat,
          foods: [
            ...(targetMeal.foods || []),
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
    } else {
      // Create new meal with this food
      await $fetch('/api/health/meals', {
        method: 'POST',
        credentials: 'include',
        body: {
          meal_type: newMealType,
          meal_date: currentMeal.mealDate,
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
    }

    // Delete food from current meal
    await $fetch(`/api/health/meal-foods/${food.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    $toast.success(`Moved to ${newMealType}`)
    fetchMeals()
  } catch (err: any) {
    console.error('Error moving food:', err)
    $toast.error('Failed to move food')
  }
}

const showMoveFoodMenu = ref<number | null>(null)

const handleMoveFood = (food: any, currentMeal: any, event: Event) => {
  const target = event.target as HTMLSelectElement
  moveFoodToMeal(food, currentMeal, target.value)
  showMoveFoodMenu.value = null
}

const closeMoveFoodMenu = () => {
  showMoveFoodMenu.value = null
}

onMounted(() => {
  document.addEventListener('click', closeMoveFoodMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMoveFoodMenu)
})
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
        <Card v-for="meal in groupedMeals" :key="meal.mealType" class="meal-card">
          <div class="meal-header">
            <h3 class="meal-type-label">{{ meal.mealType }}</h3>
            <div class="meal-actions">
              <button
                class="copy-btn"
                @click="copyMealFromYesterday(meal.mealType)"
                title="Copy from yesterday"
              >
                <Icon name="mdi:content-copy" size="18" />
              </button>
              <button class="edit-btn" @click="openEditMealModal(meal)">
                <Icon name="mdi:pencil-outline" size="18" />
              </button>
              <button class="delete-btn" @click="deleteMeal(meal)">
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
            <span>Protein: {{ formatNumber(meal.totalProtein) }}g</span>
            <span>Carbs: {{ formatNumber(meal.totalCarbs) }}g</span>
            <span>Fat: {{ formatNumber(meal.totalFat) }}g</span>
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
        <div class="modal modal-lg">
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
                :class="{ active: activeTab === 'recent' }"
                @click="activeTab = 'recent'"
              >
                Recent
              </button>
              <button
                class="tab"
                :class="{ active: activeTab === 'myFoods' }"
                @click="activeTab = 'myFoods'"
              >
                My Foods
              </button>
              <button
                class="tab"
                :class="{ active: activeTab === 'search' }"
                @click="activeTab = 'search'"
              >
                Search
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
                      <span class="result-macro">Protein {{ food.protein }}g</span>
                      <span class="result-macro">Carbs {{ food.carbs }}g</span>
                      <span class="result-macro">Fat {{ food.fat }}g</span>
                    </div>
                  </div>
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
                    <span class="macro">Protein {{ food.protein }}g</span>
                    <span class="macro">Carbs {{ food.carbs }}g</span>
                    <span class="macro">Fat {{ food.fat }}g</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- My Foods Tab -->
            <div v-if="activeTab === 'myFoods'" class="tab-content">
              <div class="saved-header my-foods-header">
                <div class="header-buttons">
                  <BaseButton variant="secondary" size="sm" @click="showCreateRecipeModal = true">
                    <Icon name="mdi:plus" size="16" />
                    Create Recipe
                  </BaseButton>
                  <BaseButton variant="secondary" size="sm" @click="showCreateFoodModal = true">
                    <Icon name="mdi:plus" size="16" />
                    Add Food
                  </BaseButton>
                </div>
                <input
                  v-model="myFoodsSearch"
                  type="text"
                  placeholder="Search foods..."
                  class="search-input"
                />
              </div>
              <div v-if="myFoods.length === 0" class="empty-state">
                <p>No saved foods yet.</p>
                <p class="hint">Add custom foods or save recipes for quick logging.</p>
              </div>
              <div v-else class="recent-foods-list">
                <div
                  v-for="food in filteredMyFoods"
                  :key="food.id + food.type"
                  class="recent-food-item"
                  @click="addMyFood(food)"
                >
                  <div class="food-info">
                    <span class="food-name">{{ food.name }}</span>
                    <span class="food-meta">{{
                      food.type === 'recipe' ? 'Recipe' : `${food.serving_size}${food.serving_unit}`
                    }}</span>
                  </div>
                  <div class="food-macros">
                    <span>{{ food.calories }} cal</span>
                    <span class="macro">Protein {{ food.protein }}g</span>
                    <span class="macro">Carbs {{ food.carbs }}g</span>
                    <span class="macro">Fat {{ food.fat }}g</span>
                  </div>
                  <div class="item-actions">
                    <button class="edit-btn" @click.stop="openEditMyFood(food)">
                      <Icon name="mdi:pencil-outline" size="16" />
                    </button>
                    <button class="delete-btn" @click.stop="deleteMyFood(food)">
                      <Icon name="mdi:delete-outline" size="16" />
                    </button>
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
        <div class="modal modal-lg">
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
                <input v-model="newRecipe.calories" type="number" placeholder="Auto" />
              </div>
              <div class="form-group">
                <label>Protein (g)</label>
                <input v-model="newRecipe.protein" type="number" placeholder="Auto" />
              </div>
              <div class="form-group">
                <label>Carbs (g)</label>
                <input v-model="newRecipe.carbs" type="number" placeholder="Auto" />
              </div>
              <div class="form-group">
                <label>Fat (g)</label>
                <input v-model="newRecipe.fat" type="number" placeholder="Auto" />
              </div>
            </div>

            <div class="recipe-ingredients-section">
              <label>Ingredients</label>
              <div class="ingredient-search-row">
                <input
                  v-model="recipeIngredientSearch"
                  type="text"
                  placeholder="Search foods or recipes..."
                  class="ingredient-search-input"
                />
                <BaseButton variant="secondary" size="sm" @click="showCustomIngredientForm = true">
                  Custom
                </BaseButton>
              </div>

              <div
                v-if="
                  recipeIngredientSearch &&
                  (recipeIngredientResults.foods.length > 0 ||
                    recipeIngredientResults.recipes.length > 0 ||
                    (recipeIngredientResults.foods.length === 0 &&
                      recipeIngredientResults.recipes.length === 0))
                "
                class="ingredient-search-results"
              >
                <div v-if="recipeIngredientResults.foods.length > 0" class="result-group">
                  <div class="result-group-title">My Foods</div>
                  <div
                    v-for="food in recipeIngredientResults.foods"
                    :key="'food-' + food.id"
                    class="result-item"
                    @click="addIngredientToRecipe(food, 'new', newRecipe.ingredients)"
                  >
                    <span class="result-name">{{ food.name }}</span>
                    <span class="result-macros">{{ food.calories }} cal</span>
                  </div>
                </div>
                <div v-if="recipeIngredientResults.recipes.length > 0" class="result-group">
                  <div class="result-group-title">Recipes</div>
                  <div
                    v-for="recipe in recipeIngredientResults.recipes"
                    :key="'recipe-' + recipe.id"
                    class="result-item"
                    @click="addIngredientToRecipe(recipe, 'new', newRecipe.ingredients)"
                  >
                    <span class="result-name">{{ recipe.name }}</span>
                    <span class="result-macros">{{ recipe.calories }} cal</span>
                    <span v-if="recipe.has_ingredients" class="result-badge">Has ingredients</span>
                  </div>
                </div>
                <div
                  v-if="
                    recipeIngredientResults.foods.length === 0 &&
                    recipeIngredientResults.recipes.length === 0
                  "
                  class="result-group"
                >
                  <div
                    class="result-item add-custom-result"
                    @click="addCustomFromSearch('new', newRecipe.ingredients)"
                  >
                    <span class="result-name">Add "{{ recipeIngredientSearch }}" as custom</span>
                    <span class="result-macros">→</span>
                  </div>
                </div>
              </div>

              <div v-if="showCustomIngredientForm" class="custom-ingredient-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Name</label>
                    <input
                      v-model="newCustomIngredient.food_name"
                      type="text"
                      placeholder="Ingredient name"
                    />
                  </div>
                  <div class="form-group">
                    <label>Servings</label>
                    <input v-model="newCustomIngredient.servings" type="number" placeholder="1" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Calories</label>
                    <input v-model="newCustomIngredient.calories" type="number" placeholder="0" />
                  </div>
                  <div class="form-group">
                    <label>Protein</label>
                    <input v-model="newCustomIngredient.protein" type="number" placeholder="0" />
                  </div>
                  <div class="form-group">
                    <label>Carbs</label>
                    <input v-model="newCustomIngredient.carbs" type="number" placeholder="0" />
                  </div>
                  <div class="form-group">
                    <label>Fat</label>
                    <input v-model="newCustomIngredient.fat" type="number" placeholder="0" />
                  </div>
                </div>
                <div class="custom-form-actions">
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    @click="showCustomIngredientForm = false"
                    >Cancel</BaseButton
                  >
                  <BaseButton
                    variant="primary"
                    size="sm"
                    @click="addCustomIngredientToRecipe('new', newRecipe.ingredients)"
                    >Add</BaseButton
                  >
                </div>
              </div>

              <div v-if="newRecipe.ingredients.length > 0" class="ingredients-list">
                <div
                  v-for="(ing, index) in newRecipe.ingredients"
                  :key="index"
                  class="ingredient-item"
                >
                  <div class="ingredient-info">
                    <span class="ingredient-name">
                      {{ ing.food_name }}
                      <span v-if="ing.type === 'recipe'" class="ingredient-badge">Recipe</span>
                    </span>
                    <div class="ingredient-macros">
                      {{ ((ing.calories || 0) * ing.servings).toFixed(0) }} cal P:
                      {{ ((ing.protein || 0) * ing.servings).toFixed(0) }}g C:
                      {{ ((ing.carbs || 0) * ing.servings).toFixed(0) }}g F:
                      {{ ((ing.fat || 0) * ing.servings).toFixed(0) }}g
                    </div>
                  </div>
                  <div class="ingredient-controls">
                    <input
                      v-model.number="ing.servings"
                      type="number"
                      min="0.25"
                      step="0.25"
                      class="servings-input"
                    />
                    <button
                      class="remove-btn"
                      @click="removeIngredientFromRecipe(index, newRecipe.ingredients)"
                    >
                      <Icon name="mdi:close" size="16" />
                    </button>
                  </div>
                </div>
                <div class="ingredients-total">
                  <strong>Total:</strong>
                  {{ calculatedRecipeMacros(newRecipe.ingredients).calories.toFixed(0) }} cal | P:
                  {{ calculatedRecipeMacros(newRecipe.ingredients).protein.toFixed(0) }}g | C:
                  {{ calculatedRecipeMacros(newRecipe.ingredients).carbs.toFixed(0) }}g | F:
                  {{ calculatedRecipeMacros(newRecipe.ingredients).fat.toFixed(0) }}g
                </div>
              </div>
              <div v-else class="ingredients-empty">No ingredients added yet</div>
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
        <div class="modal modal-lg">
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
                <input v-model="editRecipe.calories" type="number" placeholder="Auto" />
              </div>
              <div class="form-group">
                <label>Protein (g)</label>
                <input v-model="editRecipe.protein" type="number" placeholder="Auto" />
              </div>
              <div class="form-group">
                <label>Carbs (g)</label>
                <input v-model="editRecipe.carbs" type="number" placeholder="Auto" />
              </div>
              <div class="form-group">
                <label>Fat (g)</label>
                <input v-model="editRecipe.fat" type="number" placeholder="Auto" />
              </div>
            </div>

            <div class="recipe-ingredients-section">
              <label>Ingredients</label>
              <div class="ingredient-search-row">
                <input
                  v-model="recipeIngredientSearch"
                  type="text"
                  placeholder="Search foods or recipes..."
                  class="ingredient-search-input"
                />
                <BaseButton variant="secondary" size="sm" @click="showCustomIngredientForm = true">
                  Custom
                </BaseButton>
              </div>

              <div
                v-if="
                  recipeIngredientSearch &&
                  (recipeIngredientResults.foods.length > 0 ||
                    recipeIngredientResults.recipes.length > 0 ||
                    (recipeIngredientResults.foods.length === 0 &&
                      recipeIngredientResults.recipes.length === 0))
                "
                class="ingredient-search-results"
              >
                <div v-if="recipeIngredientResults.foods.length > 0" class="result-group">
                  <div class="result-group-title">My Foods</div>
                  <div
                    v-for="food in recipeIngredientResults.foods"
                    :key="'food-' + food.id"
                    class="result-item"
                    @click="addIngredientToRecipe(food, 'edit', editRecipe.ingredients)"
                  >
                    <span class="result-name">{{ food.name }}</span>
                    <span class="result-macros">{{ food.calories }} cal</span>
                  </div>
                </div>
                <div v-if="recipeIngredientResults.recipes.length > 0" class="result-group">
                  <div class="result-group-title">Recipes</div>
                  <div
                    v-for="recipe in recipeIngredientResults.recipes"
                    :key="'recipe-' + recipe.id"
                    class="result-item"
                    @click="addIngredientToRecipe(recipe, 'edit', editRecipe.ingredients)"
                  >
                    <span class="result-name">{{ recipe.name }}</span>
                    <span class="result-macros">{{ recipe.calories }} cal</span>
                    <span v-if="recipe.has_ingredients" class="result-badge">Has ingredients</span>
                  </div>
                </div>
                <div
                  v-if="
                    recipeIngredientResults.foods.length === 0 &&
                    recipeIngredientResults.recipes.length === 0
                  "
                  class="result-group"
                >
                  <div
                    class="result-item add-custom-result"
                    @click="addCustomFromSearch('edit', editRecipe.ingredients)"
                  >
                    <span class="result-name">Add "{{ recipeIngredientSearch }}" as custom</span>
                    <span class="result-macros">→</span>
                  </div>
                </div>
              </div>

              <div v-if="showCustomIngredientForm" class="custom-ingredient-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Name</label>
                    <input
                      v-model="newCustomIngredient.food_name"
                      type="text"
                      placeholder="Ingredient name"
                    />
                  </div>
                  <div class="form-group">
                    <label>Servings</label>
                    <input v-model="newCustomIngredient.servings" type="number" placeholder="1" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Calories</label>
                    <input v-model="newCustomIngredient.calories" type="number" placeholder="0" />
                  </div>
                  <div class="form-group">
                    <label>Protein</label>
                    <input v-model="newCustomIngredient.protein" type="number" placeholder="0" />
                  </div>
                  <div class="form-group">
                    <label>Carbs</label>
                    <input v-model="newCustomIngredient.carbs" type="number" placeholder="0" />
                  </div>
                  <div class="form-group">
                    <label>Fat</label>
                    <input v-model="newCustomIngredient.fat" type="number" placeholder="0" />
                  </div>
                </div>
                <div class="custom-form-actions">
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    @click="showCustomIngredientForm = false"
                    >Cancel</BaseButton
                  >
                  <BaseButton
                    variant="primary"
                    size="sm"
                    @click="addCustomIngredientToRecipe('edit', editRecipe.ingredients)"
                    >Add</BaseButton
                  >
                </div>
              </div>

              <div v-if="editRecipe.ingredients.length > 0" class="ingredients-list">
                <div
                  v-for="(ing, index) in editRecipe.ingredients"
                  :key="index"
                  class="ingredient-item"
                >
                  <div class="ingredient-info">
                    <span class="ingredient-name">
                      {{ ing.food_name }}
                      <span v-if="ing.type === 'recipe'" class="ingredient-badge">Recipe</span>
                    </span>
                    <div class="ingredient-macros">
                      {{ ((ing.calories || 0) * ing.servings).toFixed(0) }} cal P:
                      {{ ((ing.protein || 0) * ing.servings).toFixed(0) }}g C:
                      {{ ((ing.carbs || 0) * ing.servings).toFixed(0) }}g F:
                      {{ ((ing.fat || 0) * ing.servings).toFixed(0) }}g
                    </div>
                  </div>
                  <div class="ingredient-controls">
                    <input
                      v-model.number="ing.servings"
                      type="number"
                      min="0.25"
                      step="0.25"
                      class="servings-input"
                    />
                    <button
                      class="remove-btn"
                      @click="removeIngredientFromRecipe(index, editRecipe.ingredients)"
                    >
                      <Icon name="mdi:close" size="16" />
                    </button>
                  </div>
                </div>
                <div class="ingredients-total">
                  <strong>Total:</strong>
                  {{ calculatedRecipeMacros(editRecipe.ingredients).calories.toFixed(0) }} cal | P:
                  {{ calculatedRecipeMacros(editRecipe.ingredients).protein.toFixed(0) }}g | C:
                  {{ calculatedRecipeMacros(editRecipe.ingredients).carbs.toFixed(0) }}g | F:
                  {{ calculatedRecipeMacros(editRecipe.ingredients).fat.toFixed(0) }}g
                </div>
              </div>
              <div v-else class="ingredients-empty">No ingredients added yet</div>
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
              @click.prevent="saveEditedRecipe"
              :disabled="isUpdatingRecipe || !editRecipe.name"
            >
              {{ isUpdatingRecipe ? 'Saving...' : 'Save Changes' }}
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div
        v-if="showDeleteConfirmModal"
        class="modal-overlay"
        @click.self="showDeleteConfirmModal = false"
      >
        <div class="modal">
          <div class="modal-header">
            <h2>Delete {{ deleteConfirmItem?.type === 'recipe' ? 'Recipe' : 'Food' }}</h2>
            <button class="close-btn" @click="showDeleteConfirmModal = false">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>
          <div class="modal-body">
            <p>
              Are you sure you want to delete this {{ deleteConfirmItem?.type }}? This action cannot
              be undone.
            </p>
          </div>
          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showDeleteConfirmModal = false">
              Cancel
            </BaseButton>
            <BaseButton variant="primary" @click="confirmDelete"> Delete </BaseButton>
          </div>
        </div>
      </div>

      <!-- Create/Edit Custom Food Modal -->
      <div
        v-if="showCreateFoodModal"
        class="modal-overlay"
        @click.self="
          () => {
            showCreateFoodModal = false
            editingFood = null
          }
        "
      >
        <div class="modal modal-lg">
          <div class="modal-header">
            <h2>{{ editingFood ? 'Edit Food' : 'Add Custom Food' }}</h2>
            <button
              class="close-btn"
              @click="
                () => {
                  showCreateFoodModal = false
                  editingFood = null
                }
              "
            >
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
            <BaseButton
              variant="secondary"
              @click="
                () => {
                  showCreateFoodModal = false
                  editingFood = null
                }
              "
              >Cancel</BaseButton
            >
            <BaseButton
              variant="primary"
              @click="editingFood ? saveEditedCustomFood() : createCustomFood()"
              :disabled="isCreatingFood || !newCustomFood.name"
            >
              {{
                isCreatingFood
                  ? editingFood
                    ? 'Saving...'
                    : 'Creating...'
                  : editingFood
                    ? 'Save Changes'
                    : 'Add Food'
              }}
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
                      >Protein
                      {{
                        Math.round((Number(food.protein) || 0) * (Number(food.servings) || 1))
                      }}g</span
                    >
                    <span
                      >Carbs
                      {{
                        Math.round((Number(food.carbs) || 0) * (Number(food.servings) || 1))
                      }}g</span
                    >
                    <span
                      >Fat
                      {{
                        Math.round((Number(food.fat) || 0) * (Number(food.servings) || 1))
                      }}g</span
                    >
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
                        :disabled="type.value === editingMeal.mealType"
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

.meal-type-select {
  display: flex;
  align-items: center;
}

.meal-type-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: capitalize;
  margin-right: 12px;
}

.meal-type-dropdown {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: capitalize;
  cursor: pointer;
  outline: none;
}

.meal-type-dropdown:hover {
  border-color: var(--color-primary);
}

.meal-type-dropdown:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
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

.copy-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
}

.copy-btn:hover {
  color: var(--color-accent);
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
  position: relative;
}

.remove-food-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition:
    opacity 0.15s,
    background 0.15s;
}

.food-item:hover .remove-food-btn {
  opacity: 1;
}

.remove-food-btn:hover {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.move-food-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition:
    opacity 0.15s,
    background 0.15s;
}

.food-item:hover .move-food-btn {
  opacity: 1;
}

.move-food-btn:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.food-actions {
  display: flex;
  gap: 2px;
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

.move-dropdown {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.75rem;
  color: var(--color-text-primary);
  cursor: pointer;
  outline: none;
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

.move-dropdown:focus {
  border-color: var(--color-primary);
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

.edit-food-item .move-food-btn,
.edit-food-item .remove-food-edit-btn {
  opacity: 1;
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

.quick-add-food-info {
  text-align: center;
  padding: 16px;
  background: var(--color-bg-elevated);
  border-radius: 8px;
  margin-bottom: 20px;
}

.quick-add-food-name {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.quick-add-food-macros {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
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

.my-foods-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
  width: 180px;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
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

.recipe-ingredients-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.recipe-ingredients-section > label {
  display: block;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-text);
}

.ingredient-search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ingredient-search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
}

.ingredient-search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.ingredient-search-results {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.result-group {
  padding: 8px;
}

.result-group:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.result-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.result-item:hover {
  background: var(--color-bg-hover);
}

.add-custom-result {
  background: var(--color-primary);
  color: white;
}

.add-custom-result:hover {
  background: var(--color-primary-hover, var(--color-primary));
  opacity: 0.9;
}

.add-custom-result .result-name {
  color: white;
}

.add-custom-result .result-macros {
  color: rgba(255, 255, 255, 0.8);
}

.result-name {
  font-size: 14px;
  color: var(--color-text);
}

.result-macros {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.result-badge {
  font-size: 10px;
  background: var(--color-primary);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.custom-ingredient-form {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.custom-ingredient-form .form-row {
  margin-bottom: 8px;
}

.custom-form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.ingredients-list {
  max-height: 250px;
  overflow-y: auto;
}

.ingredient-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 8px;
}

.ingredient-info {
  flex: 1;
}

.ingredient-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.ingredient-badge {
  font-size: 10px;
  background: var(--color-primary);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
}

.ingredient-macros {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.ingredient-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.servings-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
  text-align: center;
}

.ingredients-total {
  text-align: right;
  font-size: 14px;
  color: var(--color-text);
  padding: 12px;
  background: var(--color-bg);
  border-radius: 8px;
  margin-top: 8px;
}

.ingredients-empty {
  text-align: center;
  padding: 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
  background: var(--color-bg);
  border-radius: 8px;
}
</style>
