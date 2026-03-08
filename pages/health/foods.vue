<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import HealthSetupRequired from '~/components/health/HealthSetupRequired.vue'
import { useHealthData } from '~/composables/health/useHealthData'
import { useFoodSearch } from '~/composables/health/useFoodSearch'
import FoodsHeader from '~/components/health/foods/FoodsHeader.vue'
import FoodsList from '~/components/health/foods/FoodsList.vue'
import FoodForm from '~/components/health/foods/FoodForm.vue'
import RecipeForm from '~/components/health/foods/RecipeForm.vue'
import DeleteConfirmModal from '~/components/health/DeleteConfirmModal.vue'
import SlideOver from '~/components/shared/SlideOver.vue'

const { $toast } = useNuxtApp()

const { setupStatus, isReady, isRecipesRefreshing, init } = useHealthData()

const needsSetup = computed(() => {
  if (!isReady.value) return false
  return !setupStatus.value?.isComplete
})

const { customFoods, savedMeals, isRefreshing, initFoods, deleteCustomFood, deleteSavedMeal } =
  useFoodSearch()

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
const foodInUseRecipes = ref<{ id: number; name: string }[]>([])

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
  // Convert string values to numbers for proper display
  const normalizedRecipe = {
    ...savedRecipe,
    calories: Number(savedRecipe.calories) || 0,
    protein: Number(savedRecipe.protein) || 0,
    carbs: Number(savedRecipe.carbs) || 0,
    fat: Number(savedRecipe.fat) || 0,
  }

  if (editingItem.value) {
    const index = savedMeals.value.findIndex(r => r.id === normalizedRecipe.id)
    if (index !== -1) {
      savedMeals.value[index] = normalizedRecipe
    }
  } else {
    savedMeals.value = [...savedMeals.value, normalizedRecipe]
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
      const result = await deleteCustomFood(itemToDelete.value.id)
      if (!result.success) {
        // Check if it's a 409 (ingredient in use)
        if (result.error?.statusCode === 409) {
          foodInUseRecipes.value = result.error.data?.recipes || []
          showDeleteModal.value = false // Close normal delete modal
          // Show warning - food is in use
          $toast?.warning(`Cannot delete: ${result.error.data?.message || 'Ingredient in use'}`)
          return
        }
        throw new Error('Failed to delete')
      }
      $toast?.success('Food deleted')
    } else {
      await deleteSavedMeal(itemToDelete.value.id)
      $toast?.success('Recipe deleted')
    }
    showDeleteModal.value = false
    itemToDelete.value = null
    foodInUseRecipes.value = []
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
      <SlideOver :show="showSlideOver" width="480px" @close="closeSlideOver">
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
      </SlideOver>

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
</style>
