<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import HealthSetupRequired from '~/components/health/HealthSetupRequired.vue'
import { useHealthData } from '~/composables/useHealthData'
import { useFoodSearch } from '~/composables/health/useFoodSearch'
import FoodsHeader from '~/components/health/foods/FoodsHeader.vue'
import FoodsList from '~/components/health/foods/FoodsList.vue'
import FoodForm from '~/components/health/foods/FoodForm.vue'
import RecipeForm from '~/components/health/foods/RecipeForm.vue'
import DeleteConfirmModal from '~/components/health/DeleteConfirmModal.vue'

const { $toast } = useNuxtApp()

const { setupStatus, isReady, init } = useHealthData()

const needsSetup = computed(() => {
  if (!isReady.value) return false
  return !setupStatus.value?.isComplete
})

const { customFoods, savedMeals, initFoods, deleteCustomFood, deleteSavedMeal } = useFoodSearch()

const activeTab = ref<'all' | 'foods' | 'recipes'>('all')
const searchQuery = ref('')
const isLoading = ref(true)

// Slide-over state
const showSlideOver = ref(false)
const slideOverMode = ref<'food' | 'recipe'>('food')
const editingItem = ref<any>(null)

// Delete modal state
const showDeleteModal = ref(false)
const itemToDelete = ref<any>(null)
const isDeleting = ref(false)

const filteredFoods = computed(() => {
  let items = customFoods.value
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      f => f.name?.toLowerCase().includes(query) || f.brand?.toLowerCase().includes(query)
    )
  }
  return items.map(f => ({ ...f, type: 'food' as const }))
})

const filteredRecipes = computed(() => {
  let items = savedMeals.value
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(r => r.name?.toLowerCase().includes(query))
  }
  return items.map(r => ({ ...r, type: 'recipe' as const }))
})

const displayItems = computed(() => {
  if (activeTab.value === 'all') {
    return [...filteredRecipes.value, ...filteredFoods.value]
  } else if (activeTab.value === 'foods') {
    return filteredFoods.value
  } else {
    return filteredRecipes.value
  }
})

const emptyMessage = computed(() => {
  if (searchQuery.value.trim()) {
    return 'No items match your search'
  }
  if (activeTab.value === 'all') return 'No foods or recipes yet. Add some to get started!'
  if (activeTab.value === 'foods') return 'No custom foods yet. Click "Add Food" to create one.'
  return 'No recipes yet. Click "Add Recipe" to create one.'
})

const openAddFood = () => {
  editingItem.value = null
  slideOverMode.value = 'food'
  showSlideOver.value = true
}

const openAddRecipe = () => {
  editingItem.value = null
  slideOverMode.value = 'recipe'
  showSlideOver.value = true
}

const openEditFood = (item: any) => {
  editingItem.value = item
  slideOverMode.value = 'food'
  showSlideOver.value = true
}

const openEditRecipe = (item: any) => {
  editingItem.value = item
  slideOverMode.value = 'recipe'
  showSlideOver.value = true
}

const closeSlideOver = () => {
  showSlideOver.value = false
  editingItem.value = null
}

const handleFoodSaved = (savedFood: any) => {
  if (editingItem.value) {
    const index = customFoods.value.findIndex(f => f.id === savedFood.id)
    if (index !== -1) {
      customFoods.value[index] = savedFood
    }
  } else {
    customFoods.value = [...customFoods.value, savedFood]
  }
  closeSlideOver()
}

const handleRecipeSaved = (savedRecipe: any) => {
  if (editingItem.value) {
    const index = savedMeals.value.findIndex(r => r.id === savedRecipe.id)
    if (index !== -1) {
      savedMeals.value[index] = savedRecipe
    }
  } else {
    savedMeals.value = [...savedMeals.value, savedRecipe]
  }
  closeSlideOver()
}

const handleDelete = (item: any) => {
  itemToDelete.value = item
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!itemToDelete.value) return

  isDeleting.value = true
  try {
    if (itemToDelete.value.type === 'food') {
      await deleteCustomFood(itemToDelete.value.id)
      $toast?.success('Food deleted')
    } else {
      await deleteSavedMeal(itemToDelete.value.id)
      $toast?.success('Recipe deleted')
    }
    showDeleteModal.value = false
    itemToDelete.value = null
  } catch (err) {
    console.error('Delete error:', err)
    $toast?.error('Failed to delete')
  } finally {
    isDeleting.value = false
  }
}

const handleDuplicate = async (item: any) => {
  try {
    if (item.type === 'food') {
      const payload = {
        name: `${item.name} (Copy)`,
        brand: item.brand,
        serving_size: item.serving_size,
        serving_unit: item.serving_unit,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
      }
      const response = await fetch('/api/health/foods/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        const result = await response.json()
        customFoods.value = [...customFoods.value, result.food]
        $toast?.success('Food duplicated!')
      }
    } else {
      $toast?.info('Recipe duplication coming soon')
    }
  } catch (err) {
    console.error('Duplicate error:', err)
    $toast?.error('Failed to duplicate')
  }
}

onMounted(async () => {
  await init()
  if (isReady.value && !needsSetup.value) {
    await initFoods()
  }
  isLoading.value = false
})
</script>

<template>
  <PageLayout title="My Foods">
    <HealthSetupRequired v-if="needsSetup" />

    <div v-else class="foods-page">
      <FoodsHeader
        :active-tab="activeTab"
        :foods-count="customFoods.length"
        :recipes-count="savedMeals.length"
        @update:activeTab="activeTab = $event"
        @add-food="openAddFood"
        @add-recipe="openAddRecipe"
        @search="searchQuery = $event"
      />

      <FoodsList
        :items="displayItems"
        :loading="isLoading"
        :empty-message="emptyMessage"
        @edit="item => (item.type === 'food' ? openEditFood(item) : openEditRecipe(item))"
        @delete="handleDelete"
        @duplicate="handleDuplicate"
      />

      <!-- Slide-over Panel -->
      <Teleport to="body">
        <Transition name="slide-over">
          <div v-if="showSlideOver" class="slide-over-overlay" @click="closeSlideOver">
            <div class="slide-over-panel" @click.stop>
              <div class="slide-over-header">
                <button class="close-btn" @click="closeSlideOver">
                  <Icon name="mdi:close" size="24" />
                </button>
              </div>
              <div class="slide-over-content">
                <FoodForm
                  v-if="slideOverMode === 'food'"
                  :food="editingItem"
                  @save="handleFoodSaved"
                  @cancel="closeSlideOver"
                />
                <RecipeForm
                  v-else
                  :recipe="editingItem"
                  @save="handleRecipeSaved"
                  @cancel="closeSlideOver"
                />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Delete Confirmation -->
      <DeleteConfirmModal
        :show="showDeleteModal"
        title="Delete Item"
        :message="`Are you sure you want to delete '${itemToDelete?.name}'?`"
        :is-loading="isDeleting"
        @confirm="confirmDelete"
        @cancel="showDeleteModal = false"
      />
    </div>
  </PageLayout>
</template>

<style scoped>
.foods-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Slide-over Styles */
.slide-over-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.slide-over-panel {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: var(--color-bg);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.slide-over-header {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.slide-over-content {
  flex: 1;
  overflow-y: auto;
}

/* Slide-over Transitions */
.slide-over-enter-active,
.slide-over-leave-active {
  transition: opacity 0.3s ease;
}

.slide-over-enter-active .slide-over-panel,
.slide-over-leave-active .slide-over-panel {
  transition: transform 0.3s ease;
}

.slide-over-enter-from,
.slide-over-leave-to {
  opacity: 0;
}

.slide-over-enter-from .slide-over-panel,
.slide-over-leave-to .slide-over-panel {
  transform: translateX(100%);
}

@media (max-width: 640px) {
  .slide-over-panel {
    max-width: 100%;
  }
}
</style>
