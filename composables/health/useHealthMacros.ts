import { useHealthDate } from './useHealthDate'

export interface MacroTargets {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MacroTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export const useHealthMacros = () => {
  const { selectedDate } = useHealthDate()
  const { $toast } = useNuxtApp()

  const targetMacros = useState<MacroTargets>('healthTargetMacros', () => ({
    calories: 2000,
    protein: 120,
    carbs: 200,
    fat: 65,
  }))

  const hasCustomTargets = useState('healthHasCustomTargets', () => false)
  const activeGoalId = useState<number | null>('healthActiveGoalId', () => null)
  const isLoadingTargets = useState('healthIsLoadingTargets', () => false)
  const isSavingTargets = useState('healthIsSavingTargets', () => false)

  const showEditTargetsModal = useState('healthShowEditTargetsModal', () => false)
  const editTargets = useState<MacroTargets>('healthEditTargets', () => ({
    calories: 2000,
    protein: 120,
    carbs: 200,
    fat: 65,
  }))

  const todaysMacros = useState<MacroTotals>('healthTodaysMacros', () => ({
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

  const remainingMacros = computed<MacroTargets>(() => ({
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

  const fetchTargetMacros = async () => {
    try {
      isLoadingTargets.value = true
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
    } catch (err) {
      console.error('Error fetching target macros:', err)
    } finally {
      isLoadingTargets.value = false
    }
  }

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

  return {
    targetMacros,
    todaysMacros,
    remainingMacros,
    macroProgress,
    hasCustomTargets,
    activeGoalId,
    isLoadingTargets,
    isSavingTargets,
    showEditTargetsModal,
    editTargets,
    setTodaysMacros,
    fetchTargetMacros,
    openEditTargets,
    saveTargets,
    closeEditTargetsModal,
  }
}
