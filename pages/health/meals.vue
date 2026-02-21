<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import Card from '~/components/Card.vue'
import MacroCard from '~/components/health/MacroCard.vue'
import BaseButton from '~/components/BaseButton.vue'

const { $toast } = useNuxtApp()

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
  id: number
  name: string
  brand: string | null
  servingSize: number
  servingUnit: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
}

const isLoading = ref(true)
const meals = ref<Meal[]>([])
const selectedDate = ref(new Date().toISOString().split('T')[0])

const showAddMealModal = ref(false)
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

const searchFoods = async () => {
  if (!searchQuery.value || searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

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

const removeFood = (index: number) => {
  selectedFoods.value.splice(index, 1)
}

const updateFoodPortion = (index: number, servings: number) => {
  const food = searchResults.value[index]
  if (food) {
    selectedFoods.value[index].servings = servings
    selectedFoods.value[index].calories = food.calories * servings
    selectedFoods.value[index].protein = food.protein * servings
    selectedFoods.value[index].carbs = food.carbs * servings
    selectedFoods.value[index].fat = food.fat * servings
  }
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

const formatNumber = (num: number) => num.toFixed(0)

onMounted(() => {
  fetchMeals()
})
</script>

<template>
  <PageLayout title="Meal Tracker">
    <div class="page-actions">
      <input v-model="selectedDate" type="date" class="date-picker" @change="fetchMeals" />
      <BaseButton variant="primary" @click="showAddMealModal = true">
        <Icon name="mdi:plus" size="20" />
        Log Meal
      </BaseButton>
    </div>

    <!-- Daily Summary -->
    <Card class="summary-card">
      <h3>Daily Totals</h3>
      <div class="summary-macros">
        <MacroCard
          label="Calories"
          :current="todaysMacros.calories"
          :target="2000"
          unit=""
          color="accent"
        />
        <MacroCard label="Protein" :current="todaysMacros.protein" :target="120" color="info" />
        <MacroCard label="Carbs" :current="todaysMacros.carbs" :target="200" color="warning" />
        <MacroCard label="Fat" :current="todaysMacros.fat" :target="65" color="error" />
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
            <span class="meal-time">{{ new Date(meal.mealDate).toLocaleDateString() }}</span>
          </div>
          <button class="delete-btn" @click="deleteMeal(meal.id)">
            <Icon name="mdi:delete-outline" size="18" />
          </button>
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
        <BaseButton variant="primary" @click="showAddMealModal = true">
          Log Your First Meal
        </BaseButton>
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

          <div class="form-group">
            <label>Search Foods</label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search foods..."
              @input="searchFoods"
            />
            <div v-if="searchResults.length" class="search-results">
              <div
                v-for="food in searchResults"
                :key="food.id"
                class="search-result"
                @click="addFood(food)"
              >
                <span class="result-name">{{ food.name }}</span>
                <span class="result-info" v-if="food.brand">{{ food.brand }}</span>
                <span class="result-cal">{{ food.calories }} cal</span>
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
                  min="0.5"
                  step="0.5"
                  class="portion-input"
                  @change="updateFoodPortion(index, food.servings)"
                />
                <span>x {{ food.calories }} cal</span>
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
  margin-bottom: 16px;
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
</style>
