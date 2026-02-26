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

export const useFoodSearch = () => {
  const searchQuery = ref('')
  const searchResults = ref<Food[]>([])
  const recentFoods = ref<any[]>([])
  const customFoods = ref<CustomFood[]>([])
  const savedMeals = ref<any[]>([])
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

  const fetchRecentFoods = async () => {
    try {
      const response = await fetch('/api/health/foods/recent', {
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      recentFoods.value = data.foods || []
    } catch (err) {
      console.error('Error fetching recent foods:', err)
    }
  }

  const fetchCustomFoods = async () => {
    try {
      const response = await fetch('/api/health/foods/custom', {
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      customFoods.value = data.foods || []
    } catch (err) {
      console.error('Error fetching custom foods:', err)
    }
  }

  const fetchSavedMeals = async () => {
    try {
      const response = await fetch('/api/health/saved-meals', {
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      savedMeals.value = data.meals || []
    } catch (err) {
      console.error('Error fetching saved meals:', err)
    }
  }

  const deleteCustomFood = async (id: number) => {
    try {
      await $fetch(`/api/health/foods/custom/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      customFoods.value = customFoods.value.filter(f => f.id !== id)
    } catch (err) {
      console.error('Error deleting food:', err)
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
    activeTab,
    searchFoods,
    doSearch,
    fetchRecentFoods,
    fetchCustomFoods,
    fetchSavedMeals,
    deleteCustomFood,
    deleteSavedMeal,
    clearSearch,
  }
}
