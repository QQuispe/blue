// Single source of truth for health infrastructure data
// Lazy-loads foods only when needed (modal opens)

import { ref } from 'vue'
import type { ApiSuccess } from '~/types/api/common'
import type { HealthDashboard, HealthGoal } from '~/types/health'
import { useEventBus, EVENTS } from '~/composables/ui/useEventBus'

interface SetupStatusData {
  isSetup: boolean
  hasProfile: boolean
  hasGoals: boolean
  message: string
}

export const useHealthData = () => {
  // === Core Infrastructure State ===
  const setupStatus = useState<SetupStatusData | null>('health:setupStatus', () => null)
  const dashboard = useState<HealthDashboard | null>('health:dashboard', () => null)
  const userSettings = useState<any>('health:userSettings', () => null)

  // === Food Data (lazy-loaded) ===
  const recentFoods = useState<any[]>('health:recentFoods', () => [])
  const customFoods = useState<any[]>('health:customFoods', () => [])
  const savedMeals = useState<any[]>('health:savedMeals', () => [])

  // === Guards ===
  const isInitialized = useState('health:initialized', () => false)
  const isInitializing = useState('health:initializing', () => false)
  const isFoodsInitialized = useState('health:foodsInitialized', () => false)

  // === Edit Targets State (need to declare before init) ===
  const { $toast } = useNuxtApp()
  const activeGoalId = useState<number | null>('healthActiveGoalId', () => null)

  // === Core Init (runs once early) ===
  const init = async (force = false) => {
    if (isInitialized.value || isInitializing.value) return
    isInitializing.value = true

    try {
      const [setupRes, settingsRes] = await Promise.all([
        $fetch<ApiSuccess<SetupStatusData>>('/api/v1/health/setup-status', {
          ignoreResponseError: true,
        }),
        $fetch('/api/v1/user/settings', { ignoreResponseError: true }),
      ])

      // Handle unauthenticated case - don't mark as initialized so it retries
      if (
        setupRes &&
        typeof setupRes === 'object' &&
        'error' in setupRes &&
        (setupRes as any).statusCode === 401
      ) {
        console.log('[HealthData] 401 auth required, will retry on next access')
        isInitializing.value = false
        return
      }

      setupStatus.value = setupRes?.data || null
      userSettings.value = (settingsRes as any)?.settings || null

      if (setupRes?.data?.isSetup) {
        const dashboardRes = await $fetch<ApiSuccess<HealthDashboard>>('/api/v1/health/dashboard', {
          ignoreResponseError: true,
        })
        dashboard.value = dashboardRes?.data || null

        // Set active goal ID from dashboard
        if (dashboardRes?.data?.profile?.goal_type) {
          activeGoalId.value = dashboardRes.data.activeGoalId || null
        }
      }

      isInitialized.value = true
    } catch (err) {
      console.error('[HealthData] Init failed:', err)
    } finally {
      isInitializing.value = false
    }
  }

  // === Lazy Food Init (called when modal opens) ===
  const initFoods = async (force = false) => {
    if (isFoodsInitialized.value && !force) return

    try {
      const [recentRes, customRes, savedRes] = await Promise.all([
        $fetch<{ foods: any[] }>('/api/v1/health/foods/recent', { ignoreResponseError: true }),
        $fetch<{ foods: any[] }>('/api/v1/health/foods/custom', { ignoreResponseError: true }),
        $fetch<{ meals: any[] }>('/api/v1/health/saved-meals', { ignoreResponseError: true }),
      ])

      recentFoods.value = (recentRes as any)?.data?.foods || []
      customFoods.value = (customRes as any)?.data?.foods || []
      savedMeals.value = (savedRes as any)?.data?.savedMeals || []

      isFoodsInitialized.value = true
    } catch (err) {
      console.error('[Health] initFoods failed:', err)
    }
  }

  const userTimezone = computed(() => userSettings.value?.timezone || 'America/New_York')

  // === Computed Macros (from dashboard) ===
  const targetMacros = computed(() => {
    const tm = dashboard.value?.targetMacros
    return tm || { calories: 2000, protein: 120, carbs: 200, fat: 65 }
  })

  // === Today's Macros (computed from meals - set by useMeals) ===
  const todaysMacros = useState('health:todaysMacros', () => ({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  }))

  const setTodaysMacros = (meals: any[]) => {
    todaysMacros.value = meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.totalCalories || 0),
        protein: acc.protein + (meal.totalProtein || 0),
        carbs: acc.carbs + (meal.totalCarbs || 0),
        fat: acc.fat + (meal.totalFat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }

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

  // === Edit Targets ===
  const hasCustomTargets = useState('healthHasCustomTargets', () => false)
  const isSavingTargets = useState('healthIsSavingTargets', () => false)
  const showEditTargetsModal = useState('healthShowEditTargetsModal', () => false)
  const editTargets = useState('healthEditTargets', () => ({
    calories: 2000,
    protein: 120,
    carbs: 200,
    fat: 65,
  }))

  const openEditTargets = () => {
    editTargets.value = { ...targetMacros.value }
    showEditTargetsModal.value = true
  }

  const saveTargets = async () => {
    if (!activeGoalId.value) {
      $toast?.error('No active goal found')
      return
    }

    try {
      isSavingTargets.value = true
      const response = await fetch(`/api/v1/health/goals/${activeGoalId.value}`, {
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
      if (dashboard.value) {
        dashboard.value.targetMacros = {
          calories: data.data?.goal?.target_calories || editTargets.value.calories,
          protein: data.data?.goal?.target_protein || editTargets.value.protein,
          carbs: data.data?.goal?.target_carbs || editTargets.value.carbs,
          fat: data.data?.goal?.target_fat || editTargets.value.fat,
        }
      }
      hasCustomTargets.value = true
      showEditTargetsModal.value = false
      $toast?.success('Targets updated!')
    } catch (err) {
      console.error('Error saving targets:', err)
      $toast?.error('Failed to save targets')
    } finally {
      isSavingTargets.value = false
    }
  }

  const closeEditTargetsModal = () => {
    showEditTargetsModal.value = false
  }

  const isReady = computed(() => isInitialized.value && setupStatus.value !== null)

  const refresh = async () => {
    isInitialized.value = false
    await init(true)
  }

  // === Reactive Cache Invalidation ===
  // Listen for food/recipe updates and refresh data
  const { on } = useEventBus()
  const isRecipesRefreshing = ref(false)

  // Refetch recipes when foods are updated (single source of truth)
  on(
    EVENTS.FOOD_UPDATED,
    async () => {
      if (!isRecipesRefreshing.value && isFoodsInitialized.value) {
        isRecipesRefreshing.value = true
        try {
          // Refetch saved meals to get enriched data with updated food values
          const savedRes = await $fetch<{ meals: any[] }>('/api/v1/health/saved-meals', {
            ignoreResponseError: true,
          })
          savedMeals.value = (savedRes as any)?.data?.savedMeals || []
        } catch (err) {
          console.error('[HealthData] Failed to refresh recipes:', err)
        } finally {
          isRecipesRefreshing.value = false
        }
      }
    },
    300
  ) // 300ms debounce

  // Also refresh when recipes are created/updated
  on(
    EVENTS.RECIPE_CREATED,
    async () => {
      if (!isRecipesRefreshing.value && isFoodsInitialized.value) {
        isRecipesRefreshing.value = true
        try {
          const savedRes = await $fetch<{ meals: any[] }>('/api/v1/health/saved-meals', {
            ignoreResponseError: true,
          })
          savedMeals.value = (savedRes as any)?.data?.savedMeals || []
        } catch (err) {
          console.error('[HealthData] Failed to refresh recipes:', err)
        } finally {
          isRecipesRefreshing.value = false
        }
      }
    },
    300
  )

  on(
    EVENTS.RECIPE_UPDATED,
    async () => {
      if (!isRecipesRefreshing.value && isFoodsInitialized.value) {
        isRecipesRefreshing.value = true
        try {
          const savedRes = await $fetch<{ meals: any[] }>('/api/v1/health/saved-meals', {
            ignoreResponseError: true,
          })
          savedMeals.value = (savedRes as any)?.data?.savedMeals || []
        } catch (err) {
          console.error('[HealthData] Failed to refresh recipes:', err)
        } finally {
          isRecipesRefreshing.value = false
        }
      }
    },
    300
  )

  return {
    // State
    setupStatus,
    dashboard,
    userSettings,
    userTimezone,
    recentFoods,
    customFoods,
    savedMeals,

    // Computed
    targetMacros,
    todaysMacros,
    remainingMacros,
    macroProgress,

    // Guards
    isInitialized,
    isFoodsInitialized,
    isRecipesRefreshing,
    isReady,

    // Edit Targets
    activeGoalId,
    hasCustomTargets,
    isSavingTargets,
    showEditTargetsModal,
    editTargets,
    openEditTargets,
    saveTargets,
    closeEditTargetsModal,

    // Methods
    init,
    initFoods,
    refresh,
    setTodaysMacros,
  }
}
