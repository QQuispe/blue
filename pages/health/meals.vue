<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import BaseModal from '~/components/health/BaseModal.vue'
import HealthSetupRequired from '~/components/health/HealthSetupRequired.vue'
import { useHealthDate } from '~/composables/health/useHealthDate'
import { useMeals, type Meal } from '~/composables/health/useMeals'
import { useFoodSearch } from '~/composables/health/useFoodSearch'
import { useHealthData } from '~/composables/useHealthData'
import MacrosSummary from '~/components/health/MacrosSummary.vue'
import MealCard from '~/components/health/MealCard.vue'
import FoodSearchPanel from '~/components/health/FoodSearchPanel.vue'
import FoodFormModal from '~/components/health/FoodFormModal.vue'
import RecipeFormModal from '~/components/health/RecipeFormModal.vue'
import DeleteConfirmModal from '~/components/health/DeleteConfirmModal.vue'
import EditTargetsModal from '~/components/health/EditTargetsModal.vue'
import BaseButton from '~/components/BaseButton.vue'

const { $toast } = useNuxtApp()

// Centralized health data
const {
  setupStatus,
  isReady,
  init,
  userSettings,
  targetMacros,
  openEditTargets: openEditTargetsModal,
} = useHealthData()

// Derived state from centralized data
const needsSetup = computed(() => {
  if (!isReady.value) return false // Show loading instead
  return !setupStatus.value?.isComplete
})
const userTimezone = computed(() => userSettings.value?.timezone || 'America/New_York')

// Composables
const { selectedDate, getLocalDateString, setSelectedDate, addDays, formatDisplayDate } =
  useHealthDate()
const { meals, groupedMeals, mealTypes, fetchMeals, saveMeal, deleteMeal } = useMeals()
const { recentFoods, customFoods, savedMeals, initFoods } = useFoodSearch()

// Local state
const isLoading = ref(true)
const showAddMealModal = ref(false)
const showEditTargetsModalRef = ref<any>(null)
const showDeleteConfirmModal = ref(false)
const itemToDelete = ref<{ id?: number; ids?: number[]; type: 'meal' | 'food' } | null>(null)
const selectedMealType = ref('breakfast')
const selectedFoods = ref<any[]>([])
const isAddingFood = ref(false)

// Search/Form modals
const showCreateFoodModal = ref(false)
const showCreateRecipeModal = ref(false)
const editingFood = ref<any>(null)

// Computed
const formatNumber = (num: number) => {
  if (num === null || num === undefined || typeof num !== 'number') return '0'
  return num.toFixed(0)
}

// Determine if we're editing an existing meal with foods
const isEditingExisting = computed(() => {
  return groupedMeals.value.some(
    m => m.mealType?.toLowerCase() === selectedMealType.value.toLowerCase() && m.foods?.length > 0
  )
})

// Get the existing meal ID for the current meal type
const existingMealId = computed(() => {
  const meal = groupedMeals.value.find(
    m => m.mealType?.toLowerCase() === selectedMealType.value.toLowerCase()
  )
  return meal?.id
})

// Button text based on state
const addButtonText = computed(() => {
  if (isEditingExisting.value && selectedFoods.value.length === 0) {
    return 'Remove All Foods'
  }
  const mealLabel =
    mealTypes.find(m => m.value === selectedMealType.value)?.label || selectedMealType.value
  return `Add to ${mealLabel}`
})

// Handlers
const goToPrevDay = () => {
  const newDate = addDays(selectedDate.value, -1)
  setSelectedDate(newDate)
  fetchMeals()
}

const goToNextDay = () => {
  const newDate = addDays(selectedDate.value, 1)
  setSelectedDate(newDate)
  fetchMeals()
}

const handleDateChange = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  setSelectedDate(value)
  fetchMeals()
}

const openNewMealModal = async (mealType?: string) => {
  selectedMealType.value = mealType || 'breakfast'

  // Fetch latest meals first to ensure we have fresh data
  await fetchMeals()

  // Check if meal already exists for this type and date - pre-populate existing foods
  const existingMeal = groupedMeals.value.find(
    m => m.mealType?.toLowerCase() === selectedMealType.value.toLowerCase()
  )

  if (existingMeal?.foods?.length > 0) {
    // Load existing foods so user can add more
    selectedFoods.value = existingMeal.foods.map(f => ({
      food_name: f.food_name,
      food_id: f.food_id,
      servings: f.servings,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
    }))
  } else {
    selectedFoods.value = []
  }

  showAddMealModal.value = true
}

const handleAddFoods = (foods: any[]) => {
  selectedFoods.value = foods
}

const handleSaveMeal = async () => {
  // If editing existing meal and no foods selected, delete the meal
  if (isEditingExisting.value && selectedFoods.value.length === 0) {
    if (!existingMealId.value) return

    isAddingFood.value = true
    try {
      await deleteMeal({
        id: existingMealId.value,
        mealType: selectedMealType.value,
        mealDate: selectedDate.value,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
      })
      showAddMealModal.value = false
      selectedFoods.value = []
      // fetchMeals() called by composable after delete
      $toast?.success('Meal cleared')
    } finally {
      isAddingFood.value = false
    }
    return
  }

  if (selectedFoods.value.length === 0) {
    $toast?.error('Add at least one food')
    return
  }

  isAddingFood.value = true
  try {
    await saveMeal(selectedMealType.value, selectedFoods.value)
    showAddMealModal.value = false
    selectedFoods.value = []
    // fetchMeals() called by composable after save
  } finally {
    isAddingFood.value = false
  }
}

const handleDeleteMeal = (meal: any) => {
  itemToDelete.value = { id: meal.mealIds?.[0], ids: meal.mealIds, type: 'meal' }
  showDeleteConfirmModal.value = true
}

const handleConfirmDelete = async () => {
  if (!itemToDelete.value) return

  if (itemToDelete.value.type === 'meal') {
    await deleteMeal({
      id: itemToDelete.value.id,
      mealIds: itemToDelete.value.ids,
      mealType: '',
      mealDate: '',
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    } as any)
    $toast?.success('Meal deleted')
  }

  showDeleteConfirmModal.value = false
  itemToDelete.value = null
}

const handleFoodSaved = () => {
  initFoods()
  showCreateFoodModal.value = false
  editingFood.value = null
}

const handleRecipeSaved = () => {
  initFoods()
  showCreateRecipeModal.value = false
}

const closeFoodModal = () => {
  showCreateFoodModal.value = false
  editingFood.value = null
}

const closeDeleteModal = () => {
  showDeleteConfirmModal.value = false
  itemToDelete.value = null
}

// Initialize
onMounted(async () => {
  // Initialize health data (lazy - will fetch setupStatus, settings, dashboard)
  await init()

  if (isReady.value && !needsSetup.value) {
    selectedDate.value = getLocalDateString()
    await fetchMeals()
  }
  isLoading.value = false
})
</script>

<template>
  <PageLayout title="Meals">
    <!-- Loading - show while waiting for plugin init or page loading -->
    <div v-if="!isReady || isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <!-- Setup Required -->
    <HealthSetupRequired v-else-if="needsSetup" />

    <!-- Main Content -->
    <div v-else class="meals-page">
      <!-- Header -->
      <div class="page-header">
        <div class="date-picker">
          <button class="date-nav-btn" @click="goToPrevDay" aria-label="Previous day">
            <Icon name="mdi:chevron-left" size="20" />
          </button>
          <div class="date-display">
            <button
              class="calendar-trigger"
              @click="($refs.dateInput as HTMLInputElement).showPicker?.()"
            >
              <Icon name="mdi:calendar" size="18" />
              <span class="date-text">{{ formatDisplayDate(selectedDate) }}</span>
            </button>
            <input
              ref="dateInput"
              type="date"
              :value="selectedDate"
              @input="handleDateChange"
              class="hidden-date-input"
            />
          </div>
          <button class="date-nav-btn" @click="goToNextDay" aria-label="Next day">
            <Icon name="mdi:chevron-right" size="20" />
          </button>
        </div>
      </div>

      <!-- Macros Summary -->
      <MacrosSummary @edit-targets="openEditTargetsModal" />

      <!-- Meals List -->
      <div class="meals-list">
        <MealCard
          v-for="meal in groupedMeals"
          :key="meal.mealType"
          :meal="meal"
          @add="mealType => openNewMealModal(mealType)"
        />
      </div>
    </div>

    <!-- Add Meal Modal -->
    <BaseModal
      :show="showAddMealModal"
      :title="`Add to ${mealTypes.find(m => m.value === selectedMealType)?.label || selectedMealType}`"
      size="lg"
      @close="showAddMealModal = false"
    >
      <FoodSearchPanel
        :selected-meal-type="selectedMealType"
        :existing-foods="selectedFoods"
        @add-food="handleAddFoods"
        @open-food-form="showCreateFoodModal = true"
        @open-recipe-form="showCreateRecipeModal = true"
      />

      <template #footer>
        <div class="selected-foods-summary">
          <span v-if="selectedFoods.length">{{ selectedFoods.length }} food(s) selected</span>
          <span v-else>Select foods to add</span>
          <BaseButton
            variant="primary"
            :loading="isAddingFood"
            :disabled="selectedFoods.length === 0 && !isEditingExisting"
            @click="handleSaveMeal"
          >
            {{ addButtonText }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Food Form Modal -->
    <FoodFormModal
      :show="showCreateFoodModal"
      :food="editingFood"
      @save="handleFoodSaved"
      @close="closeFoodModal"
    />

    <!-- Recipe Form Modal -->
    <RecipeFormModal
      :show="showCreateRecipeModal"
      @save="handleRecipeSaved"
      @close="showCreateRecipeModal = false"
    />

    <!-- Delete Confirmation -->
    <DeleteConfirmModal
      :show="showDeleteConfirmModal"
      title="Delete Meal"
      message="Are you sure you want to delete this meal? This action cannot be undone."
      @confirm="handleConfirmDelete"
      @cancel="closeDeleteModal"
    />

    <!-- Edit Targets Modal -->
    <EditTargetsModal />
  </PageLayout>
</template>

<style scoped>
.meals-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.date-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 4px;
}

.date-picker .date-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.date-picker .date-nav-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.date-picker .date-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  height: 36px;
}

.date-picker .calendar-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 4px;
  cursor: pointer;
  padding: 4px 4px 4px 0;
}

.date-picker .calendar-trigger:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.date-picker .date-text {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text-primary);
  min-width: 100px;
}

.date-picker .hidden-date-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.meals-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.empty-state p {
  margin: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--color-text-muted);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.meal-type-selector {
  margin-bottom: 20px;
}

.meal-type-selector label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.meal-type-selector select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
}

.selected-foods-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>
