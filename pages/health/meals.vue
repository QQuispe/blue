<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import HealthSetupRequired from '~/components/health/HealthSetupRequired.vue'
import { useHealthDate } from '~/composables/health/useHealthDate'
import { useHealthMacros } from '~/composables/health/useHealthMacros'
import { useMeals, type Meal } from '~/composables/health/useMeals'
import { useFoodSearch } from '~/composables/health/useFoodSearch'
import MacrosSummary from '~/components/health/MacrosSummary.vue'
import MealCard from '~/components/health/MealCard.vue'
import MealEditModal from '~/components/health/MealEditModal.vue'
import FoodSearchPanel from '~/components/health/FoodSearchPanel.vue'
import FoodFormModal from '~/components/health/FoodFormModal.vue'
import RecipeFormModal from '~/components/health/RecipeFormModal.vue'
import DeleteConfirmModal from '~/components/health/DeleteConfirmModal.vue'
import EditTargetsModal from '~/components/health/EditTargetsModal.vue'
import BaseButton from '~/components/BaseButton.vue'

const { $toast } = useNuxtApp()

// Setup check
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

// Composables
const { userTimezone, selectedDate, fetchUserTimezone, getLocalDateString, setSelectedDate } =
  useHealthDate()
const { targetMacros, fetchTargetMacros, openEditTargets } = useHealthMacros()
const { meals, groupedMeals, mealTypes, fetchMeals, copyMealFromYesterday, saveMeal, deleteMeal } =
  useMeals()
const {
  recentFoods,
  customFoods,
  savedMeals,
  fetchRecentFoods,
  fetchCustomFoods,
  fetchSavedMeals,
} = useFoodSearch()

// Local state
const isLoading = ref(true)
const showAddMealModal = ref(false)
const showEditMealModal = ref(false)
const showEditTargetsModalRef = ref<any>(null)
const showDeleteConfirmModal = ref(false)
const itemToDelete = ref<{ id: number; type: 'meal' | 'food' } | null>(null)
const editingMeal = ref<Meal | null>(null)
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

const formatDateForInput = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Handlers
const handleDateChange = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  setSelectedDate(value)
  fetchMeals()
}

const openNewMealModal = () => {
  selectedFoods.value = []
  selectedMealType.value = 'breakfast'
  showAddMealModal.value = true
}

const handleAddFoods = (foods: any[]) => {
  selectedFoods.value = foods
}

const handleSaveMeal = async () => {
  if (selectedFoods.value.length === 0) {
    $toast?.error('Add at least one food')
    return
  }

  isAddingFood.value = true
  try {
    await saveMeal(selectedMealType.value, selectedFoods.value)
    showAddMealModal.value = false
    selectedFoods.value = []
    fetchMeals()
  } finally {
    isAddingFood.value = false
  }
}

const openEditMeal = (meal: Meal) => {
  editingMeal.value = meal
  showEditMealModal.value = true
}

const handleDeleteMeal = (meal: any) => {
  itemToDelete.value = { id: meal.id, type: 'meal' }
  showDeleteConfirmModal.value = true
}

const handleConfirmDelete = async () => {
  if (!itemToDelete.value) return

  if (itemToDelete.value.type === 'meal') {
    await deleteMeal({
      id: itemToDelete.value.id,
      mealType: '',
      mealDate: '',
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    } as any)
  }

  showDeleteConfirmModal.value = false
  itemToDelete.value = null
}

const handleCopyMeal = async (mealType: string) => {
  await copyMealFromYesterday(mealType)
}

const handleFoodSaved = () => {
  fetchCustomFoods()
  showCreateFoodModal.value = false
  editingFood.value = null
}

const handleRecipeSaved = () => {
  fetchSavedMeals()
  showCreateRecipeModal.value = false
}

const closeEditMealModal = () => {
  showEditMealModal.value = false
  editingMeal.value = null
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
  await checkSetup()
  if (!needsSetup.value) {
    await fetchUserTimezone()
    selectedDate.value = getLocalDateString()
    await Promise.all([
      fetchMeals(),
      fetchTargetMacros(),
      fetchSavedMeals(),
      fetchRecentFoods(),
      fetchCustomFoods(),
    ])
  }
  isLoading.value = false
})
</script>

<template>
  <PageLayout title="Meals">
    <!-- Loading -->
    <div v-if="isCheckingSetup || isLoading" class="loading-state">
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
          <input type="date" :value="selectedDate" @input="handleDateChange" />
        </div>
        <div class="header-actions">
          <BaseButton variant="secondary" size="sm" @click="openEditTargets">
            Edit Targets
          </BaseButton>
          <BaseButton variant="primary" @click="openNewMealModal">
            <Icon name="mdi:plus" size="18" />
            Add Meal
          </BaseButton>
        </div>
      </div>

      <!-- Macros Summary -->
      <MacrosSummary />

      <!-- Meals List -->
      <div class="meals-list">
        <MealCard
          v-for="meal in groupedMeals"
          :key="meal.mealType"
          :meal="meal"
          @edit="openEditMeal"
          @delete="handleDeleteMeal"
          @copy="handleCopyMeal"
        />
        <div v-if="groupedMeals.length === 0" class="empty-state">
          <Icon name="mdi:food-off" size="48" />
          <p>No meals logged for this day</p>
          <BaseButton variant="primary" @click="openNewMealModal"> Log Your First Meal </BaseButton>
        </div>
      </div>
    </div>

    <!-- Add Meal Modal -->
    <BaseModal
      :show="showAddMealModal"
      title="Add Meal"
      size="lg"
      @close="showAddMealModal = false"
    >
      <div class="meal-type-selector">
        <label>Meal Type</label>
        <select v-model="selectedMealType">
          <option v-for="type in mealTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
      </div>

      <FoodSearchPanel
        :selected-meal-type="selectedMealType"
        @add-food="handleAddFoods"
        @open-food-form="showCreateFoodModal = true"
        @open-recipe-form="showCreateRecipeModal = true"
      />

      <template v-if="selectedFoods.length" #footer>
        <div class="selected-foods-summary">
          <span>{{ selectedFoods.length }} food(s) selected</span>
          <BaseButton variant="primary" :loading="isAddingFood" @click="handleSaveMeal">
            Add to {{ selectedMealType }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Edit Meal Modal -->
    <MealEditModal
      :show="showEditMealModal"
      :meal="editingMeal"
      @save="fetchMeals"
      @close="closeEditMealModal"
    />

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

.date-picker input {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
}

.date-picker input:focus {
  outline: none;
  border-color: var(--color-accent);
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
