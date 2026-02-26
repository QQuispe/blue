<script setup lang="ts">
import { useFoodSearch } from '~/composables/health/useFoodSearch'
import { useAuth } from '~/composables/useAuth'
import DeleteConfirmModal from './DeleteConfirmModal.vue'
import FoodFormModal from './FoodFormModal.vue'
import RecipeFormModal from './RecipeFormModal.vue'

interface Props {
  selectedMealType?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedMealType: 'breakfast',
})

const emit = defineEmits<{
  'add-food': [food: any]
  'open-food-form': []
  'open-recipe-form': []
}>()

const { user, isAdmin } = useAuth()

const {
  searchQuery,
  searchResults,
  recentFoods,
  customFoods,
  savedMeals,
  isSearching,
  activeTab,
  searchFoods,
  fetchRecentFoods,
  fetchCustomFoods,
  fetchSavedMeals,
  deleteCustomFood,
  deleteSavedMeal,
  clearSearch,
} = useFoodSearch()

// Edit/Delete state
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const itemToEdit = ref<any>(null)
const itemToDelete = ref<{ id: number; type: 'food' | 'recipe' } | null>(null)
const isDeleting = ref(false)
const showRecipeEditModal = ref(false)
const recipeToEdit = ref<any>(null)

// My Foods search
const myFoodsSearch = ref('')

const filteredMyFoods = computed(() => {
  if (!myFoodsSearch.value.trim()) {
    return myFoods.value
  }
  const query = myFoodsSearch.value.toLowerCase()
  return myFoods.value.filter(
    (item: any) =>
      item.name?.toLowerCase().includes(query) || item.brand?.toLowerCase().includes(query)
  )
})

const canEdit = (item: any) => {
  return item.user_id === user.value?.id || isAdmin.value
}

const handleEdit = (item: any) => {
  if (item.type === 'recipe') {
    recipeToEdit.value = item
    showRecipeEditModal.value = true
  } else {
    itemToEdit.value = item
    showEditModal.value = true
  }
}

const handleDelete = (item: any, type: 'food' | 'recipe') => {
  itemToDelete.value = { id: item.id, type }
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!itemToDelete.value) return

  isDeleting.value = true
  try {
    if (itemToDelete.value.type === 'food') {
      await deleteCustomFood(itemToDelete.value.id)
      customFoods.value = customFoods.value.filter(f => f.id !== itemToDelete.value?.id)
    } else {
      await deleteSavedMeal(itemToDelete.value.id)
      savedMeals.value = savedMeals.value.filter(m => m.id !== itemToDelete.value?.id)
    }
    showDeleteModal.value = false
    itemToDelete.value = null
  } catch (err) {
    console.error('Delete failed:', err)
  } finally {
    isDeleting.value = false
  }
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  itemToDelete.value = null
}

const closeEditModal = () => {
  showEditModal.value = false
  itemToEdit.value = null
}

const closeRecipeEditModal = () => {
  showRecipeEditModal.value = false
  recipeToEdit.value = null
}

const handleFoodSaved = () => {
  closeEditModal()
  fetchCustomFoods()
}

const handleRecipeSaved = () => {
  closeRecipeEditModal()
  fetchSavedMeals()
}

const myFoods = computed(() => {
  const custom = customFoods.value.map(f => ({ ...f, type: 'food' }))
  const saved = savedMeals.value.map(m => ({ ...m, type: 'recipe' }))
  return [...custom, ...saved]
})

const selectedFoods = ref<any[]>([])

const addToSelection = (food: any) => {
  const existing = selectedFoods.value.find(
    f => f.food_name === food.food_name || f.name === food.name
  )

  if (existing) {
    existing.servings = (existing.servings || 1) + 1
  } else {
    selectedFoods.value.push({
      food_name: food.name || food.food_name,
      food_id: food.fdcId || food.id,
      servings: 1,
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
    })
  }
}

const removeFromSelection = (index: number) => {
  selectedFoods.value.splice(index, 1)
}

const updateServings = (index: number, value: number) => {
  if (value <= 0) {
    removeFromSelection(index)
  } else {
    selectedFoods.value[index].servings = value
  }
}

const emitSelectedFoods = () => {
  emit('add-food', [...selectedFoods.value])
  selectedFoods.value = []
}

onMounted(() => {
  fetchRecentFoods()
  fetchCustomFoods()
  fetchSavedMeals()
})

defineExpose({
  selectedFoods,
  addToSelection,
  removeFromSelection,
  updateServings,
  emitSelectedFoods,
})
</script>

<template>
  <div class="food-search-panel">
    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'recent' }" @click="activeTab = 'recent'">
        Recent
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'myFoods' }"
        @click="activeTab = 'myFoods'"
      >
        My Foods
      </button>
      <button class="tab" :class="{ active: activeTab === 'search' }" @click="activeTab = 'search'">
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
            @click="addToSelection(food)"
          >
            <div class="result-main">
              <span class="result-name">{{ food.description || food.name }}</span>
              <span class="result-serving"
                >{{ food.servingSize }}{{ food.servingSizeUnit }} per serving</span
              >
            </div>
            <div class="result-macros">
              <span class="result-cal">{{ food.calories }} cal</span>
              <span class="result-macro">P {{ food.protein }}g</span>
              <span class="result-macro">C {{ food.carbs }}g</span>
              <span class="result-macro">F {{ food.fat }}g</span>
            </div>
          </div>
        </div>
        <div v-else-if="isSearching" class="loading">Searching...</div>
      </div>
    </div>

    <!-- Recent Tab -->
    <div v-if="activeTab === 'recent'" class="tab-content">
      <div v-if="recentFoods.length === 0" class="empty-state">
        <p>No recent foods.</p>
        <p class="hint">Foods you log will appear here for quick access.</p>
      </div>
      <div v-else class="foods-list">
        <div
          v-for="food in recentFoods"
          :key="food.food_name"
          class="food-item"
          @click="addToSelection(food)"
        >
          <div class="food-info">
            <span class="food-name">{{ food.food_name }}</span>
            <span class="food-meta">{{ food.meal_type }}</span>
          </div>
          <div class="food-macros">
            <span>{{ food.calories }} cal</span>
            <span class="macro">P {{ food.protein }}g</span>
            <span class="macro">C {{ food.carbs }}g</span>
            <span class="macro">F {{ food.fat }}g</span>
          </div>
        </div>
      </div>
    </div>

    <!-- My Foods Tab -->
    <div v-if="activeTab === 'myFoods'" class="tab-content">
      <div class="saved-header">
        <div class="my-foods-search">
          <Icon name="mdi:magnify" size="14" class="search-icon" />
          <input
            v-model="myFoodsSearch"
            type="text"
            placeholder="Search foods & recipes..."
            class="search-input"
          />
        </div>
        <div class="header-buttons">
          <button class="btn btn-sm" @click="emit('open-recipe-form')">
            <Icon name="mdi:plus" size="16" />
            Recipe
          </button>
          <button class="btn btn-sm" @click="emit('open-food-form')">
            <Icon name="mdi:plus" size="16" />
            Food
          </button>
        </div>
      </div>
      <div v-if="filteredMyFoods.length === 0" class="empty-state">
        <p v-if="myFoodsSearch">No foods match your search.</p>
        <p v-else>No saved foods yet.</p>
        <p class="hint">Add custom foods or save recipes for quick logging.</p>
      </div>
      <div v-else class="foods-list">
        <div
          v-for="food in filteredMyFoods"
          :key="food.id + food.type"
          class="food-item"
          @click="addToSelection(food)"
        >
          <div class="food-info">
            <span class="food-name">{{ food.name }}</span>
            <span class="food-meta">
              {{ food.type === 'recipe' ? 'Recipe' : `${food.serving_size}${food.serving_unit}` }}
            </span>
          </div>
          <div class="food-macros">
            <span>{{ food.calories }} cal</span>
            <span class="macro">P {{ food.protein }}g</span>
            <span class="macro">C {{ food.carbs }}g</span>
            <span class="macro">F {{ food.fat }}g</span>
          </div>
          <div v-if="canEdit(food)" class="food-actions" @click.stop>
            <button class="action-btn" @click="handleEdit(food)" title="Edit">
              <Icon name="mdi:pencil-outline" size="16" />
            </button>
            <button class="action-btn delete" @click="handleDelete(food, food.type)" title="Delete">
              <Icon name="mdi:delete-outline" size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Foods -->
    <div v-if="selectedFoods.length" class="selected-foods">
      <h4>Selected Foods</h4>
      <div v-for="(food, index) in selectedFoods" :key="index" class="selected-item">
        <span>{{ food.food_name }}</span>
        <div class="portion-controls">
          <input
            type="number"
            :value="food.servings"
            min="0.25"
            step="0.25"
            class="portion-input"
            @input="updateServings(index, Number(($event.target as HTMLInputElement).value))"
          />
          <span>x</span>
          <span class="calories">
            {{ Math.round((food.calories || 0) * (food.servings || 1)) }} cal
          </span>
          <button class="remove-btn" @click="removeFromSelection(index)">
            <Icon name="mdi:close" size="14" />
          </button>
        </div>
      </div>
      <button class="btn btn-primary btn-block" @click="emitSelectedFoods">
        Add to {{ selectedMealType }}
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmModal
      :show="showDeleteModal"
      title="Delete Item"
      :message="`Are you sure you want to delete '${itemToDelete?.type === 'food' ? customFoods.find(f => f.id === itemToDelete?.id)?.name : savedMeals.find(m => m.id === itemToDelete?.id)?.name}'?`"
      :is-loading="isDeleting"
      @confirm="confirmDelete"
      @cancel="closeDeleteModal"
    />

    <!-- Edit Food Modal -->
    <FoodFormModal
      :show="showEditModal"
      :food="itemToEdit"
      @save="handleFoodSaved"
      @close="closeEditModal"
    />

    <!-- Edit Recipe Modal -->
    <RecipeFormModal
      :show="showRecipeEditModal"
      :recipe="recipeToEdit"
      @save="handleRecipeSaved"
      @close="closeRecipeEditModal"
    />
  </div>
</template>

<style scoped>
.food-search-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}

.tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.tab:hover {
  background: var(--color-bg-hover);
}

.tab.active {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.tab-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.form-group {
  position: relative;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.search-result {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s;
}

.search-result:hover {
  background: var(--color-bg-hover);
}

.search-result:last-child {
  border-bottom: none;
}

.result-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.result-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.result-serving {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.result-macros {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.result-macro {
  color: var(--color-text-muted);
}

.foods-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
  flex-shrink: 0;
}

.food-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.food-item:hover {
  border-color: var(--color-accent);
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
}

.food-macros {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.food-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.food-actions .action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.food-actions .action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.food-actions .action-btn.delete:hover {
  color: var(--color-error);
}

.food-macros .macro {
  color: var(--color-text-muted);
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--color-text-muted);
}

.empty-state .hint {
  font-size: 0.875rem;
  margin-top: 8px;
}

.saved-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.my-foods-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 30px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  flex: 1;
}

.my-foods-search .search-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.my-foods-search .search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  outline: none;
}

.my-foods-search .search-input::placeholder {
  color: var(--color-text-muted);
}

.header-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
}

.btn:hover {
  background: var(--color-bg-hover);
}

.btn-sm {
  padding: 6px 10px;
  font-size: 0.75rem;
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg-primary);
  border-color: var(--color-accent);
}

.btn-primary:hover {
  background: var(--color-accent-dark);
}

.btn-block {
  width: 100%;
  justify-content: center;
}

.selected-foods {
  position: sticky;
  bottom: 0;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
  margin-top: auto;
}

.selected-foods h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 12px;
}

.selected-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
}

.selected-item:last-of-type {
  border-bottom: none;
}

.portion-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.portion-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  text-align: center;
  font-size: 0.8125rem;
}

.calories {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
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

.loading {
  text-align: center;
  padding: 16px;
  color: var(--color-text-muted);
}
</style>
