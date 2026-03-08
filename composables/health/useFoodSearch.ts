import { ref } from 'vue'

export interface Food {
  fdcId?: number
  id?: number
  description?: string
  name?: string
  brandOwner?: string
  brand?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  servingSize?: number
  servingSizeUnit?: string
  serving_size?: number
  serving_unit?: string
}

export interface CustomFood {
  id: number
  user_id?: number
  name: string
  brand?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_size: number
  serving_unit: string
  fiber?: number
}

import { useEventBus, EVENTS } from '~/composables/ui/useEventBus'

export const useFoodSearch = () => {
  // Use centralized health data
  const { recentFoods, customFoods, savedMeals, isFoodsInitialized, initFoods } = useHealthData()
  const { on } = useEventBus()
  const isRefreshing = ref(false)

  // Listen for food updated events and refresh cache
  on(
    EVENTS.FOOD_UPDATED,
    async payload => {
      // Check if this food is in our cache
      const foodInCache = customFoods.value.find(f => f.id === payload.foodId)
      if (foodInCache && !isRefreshing.value) {
        isRefreshing.value = true
        try {
          // Refetch all custom foods to get fresh data
          await initFoods(true) // Force refresh
        } finally {
          isRefreshing.value = false
        }
      }
    },
    300
  ) // 300ms debounce

  // Also listen for food created events
  on(
    EVENTS.FOOD_CREATED,
    async () => {
      if (!isRefreshing.value) {
        isRefreshing.value = true
        try {
          await initFoods(true) // Force refresh
        } finally {
          isRefreshing.value = false
        }
      }
    },
    300
  )

  const searchQuery = ref('')
  const searchResults = ref<Food[]>([])
  const isSearching = ref(false)
  const activeTab = ref<'recent' | 'myFoods' | 'search'>('recent')

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  const doSearch = async () => {
    if (!searchQuery.value.trim()) {
      searchResults.value = []
      return
    }

    try {
      isSearching.value = true
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
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      isSearching.value = false
    }
  }

  const searchFoods = () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      doSearch()
    }, 300)
  }

  // Delete functions - update cached state after deletion
  const deleteCustomFood = async (id: number): Promise<{ success: boolean; error?: any }> => {
    try {
      await $fetch(`/api/health/foods/custom/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      customFoods.value = customFoods.value.filter(f => f.id !== id)
      return { success: true }
    } catch (err: any) {
      console.error('Error deleting food:', err)
      return { success: false, error: err }
    }
  }

  const deleteSavedMeal = async (id: number) => {
    try {
      await $fetch(`/api/health/saved-meals/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      savedMeals.value = savedMeals.value.filter(m => m.id !== id)
    } catch (err) {
      console.error('Error deleting meal:', err)
    }
  }

  const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = []
  }

  return {
    searchQuery,
    searchResults,
    recentFoods,
    customFoods,
    savedMeals,
    isSearching,
    isRefreshing,
    activeTab,
    isFoodsInitialized,
    searchFoods,
    doSearch,
    initFoods,
    deleteCustomFood,
    deleteSavedMeal,
    clearSearch,
  }
}
