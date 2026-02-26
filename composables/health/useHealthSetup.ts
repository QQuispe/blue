export interface ProfileData {
  weight: number | null
  height: number | null
  age: number | null
  gender: string | null
  activityLevel: string
}

export interface GoalData {
  goalType: string
  startingWeight: number | null
  targetWeight: number | null
  targetDate: string | null
  weeklyRate: number
  targetCalories: number | null
  targetProtein: number | null
  targetCarbs: number | null
  targetFat: number | null
}

export interface PreferencesData {
  mealsPerDay: number
  preferredCuisines: string[]
  workoutDays: number[]
  workoutDuration: number
  equipment: string[]
}

export const useHealthSetup = () => {
  const { $toast } = useNuxtApp()
  const router = useRouter()

  const isLoading = ref(false)
  const hasChanges = ref(false)
  const currentStep = ref(0)
  const totalSteps = 4

  const profile = ref<ProfileData>({
    weight: null,
    height: null,
    age: null,
    gender: null,
    activityLevel: 'moderate',
  })

  const goal = ref<GoalData>({
    goalType: 'maintain',
    startingWeight: null,
    targetWeight: null,
    targetDate: null,
    weeklyRate: 1,
    targetCalories: null,
    targetProtein: null,
    targetCarbs: null,
    targetFat: null,
  })

  const preferences = ref<PreferencesData>({
    mealsPerDay: 3,
    preferredCuisines: [],
    workoutDays: [],
    workoutDuration: 45,
    equipment: [],
  })

  const fetchExistingData = async () => {
    try {
      isLoading.value = true

      const [profileRes, goalRes, prefsRes] = await Promise.all([
        $fetch('/api/health/profile', { credentials: 'include' }),
        $fetch('/api/health/goals', { credentials: 'include' }),
        $fetch('/api/health/preferences', { credentials: 'include' }),
      ])

      if (profileRes.profile) {
        profile.value = {
          weight: profileRes.profile.weight,
          height: profileRes.profile.height,
          age: profileRes.profile.age,
          gender: profileRes.profile.gender,
          activityLevel: profileRes.profile.activityLevel || 'moderate',
        }
      }

      const activeGoal = (goalRes as any).activeGoal || (goalRes as any).goal
      if (activeGoal) {
        goal.value = {
          goalType: activeGoal.goalType,
          startingWeight: activeGoal.startingWeight,
          targetWeight: activeGoal.targetWeight,
          targetDate: activeGoal.targetDate,
          weeklyRate: activeGoal.weeklyRate,
          targetCalories: activeGoal.targetCalories,
          targetProtein: activeGoal.targetProtein,
          targetCarbs: activeGoal.targetCarbs,
          targetFat: activeGoal.targetFat,
        }
      }

      const prefs = (prefsRes as any).preferences || prefsRes
      if (prefs) {
        preferences.value = {
          mealsPerDay: prefs.mealCount || prefs.mealsPerDay || 3,
          preferredCuisines: prefs.preferredCuisines || prefs.likedFoods || [],
          workoutDays: prefs.workoutDays || [],
          workoutDuration: prefs.workoutDuration || 45,
          equipment: prefs.equipment || [],
        }
      }
    } catch (err) {
      console.error('Error fetching setup data:', err)
    } finally {
      isLoading.value = false
    }
  }

  const saveProfile = async () => {
    try {
      await $fetch('/api/health/profile', {
        method: 'PUT',
        credentials: 'include',
        body: profile.value,
      })
      hasChanges.value = false
      return true
    } catch (err) {
      console.error('Error saving profile:', err)
      $toast?.error('Failed to save profile')
      return false
    }
  }

  const saveGoal = async () => {
    try {
      const existingGoals = await $fetch('/api/health/goals', { credentials: 'include' })
      const activeGoal = (existingGoals as any).activeGoal || (existingGoals as any).goal

      if (activeGoal) {
        await $fetch(`/api/health/goals/${activeGoal.id}`, {
          method: 'PUT',
          credentials: 'include',
          body: {
            goal_type: goal.value.goalType,
            starting_weight: goal.value.startingWeight,
            target_weight: goal.value.targetWeight,
            target_date: goal.value.targetDate,
            weekly_rate: goal.value.weeklyRate,
            target_calories: goal.value.targetCalories,
            target_protein: goal.value.targetProtein,
            target_carbs: goal.value.targetCarbs,
            target_fat: goal.value.targetFat,
          },
        })
      } else {
        await $fetch('/api/health/goals', {
          method: 'POST',
          credentials: 'include',
          body: {
            goal_type: goal.value.goalType,
            starting_weight: goal.value.startingWeight,
            target_weight: goal.value.targetWeight,
            target_date: goal.value.targetDate,
            weekly_rate: goal.value.weeklyRate,
            target_calories: goal.value.targetCalories,
            target_protein: goal.value.targetProtein,
            target_carbs: goal.value.targetCarbs,
            target_fat: goal.value.targetFat,
            is_active: true,
          },
        })
      }
      hasChanges.value = false
      return true
    } catch (err) {
      console.error('Error saving goal:', err)
      $toast?.error('Failed to save goal')
      return false
    }
  }

  const savePreferences = async () => {
    try {
      await $fetch('/api/health/preferences', {
        method: 'PUT',
        credentials: 'include',
        body: preferences.value,
      })
      hasChanges.value = false
      return true
    } catch (err) {
      console.error('Error saving preferences:', err)
      $toast?.error('Failed to save preferences')
      return false
    }
  }

  const completeSetup = async () => {
    isLoading.value = true
    try {
      await Promise.all([saveProfile(), saveGoal(), savePreferences()])
      $toast?.success('Setup complete!')
      router.push('/health')
    } finally {
      isLoading.value = false
    }
  }

  const nextStep = () => {
    if (currentStep.value < totalSteps - 1) {
      currentStep.value++
    }
  }

  const prevStep = () => {
    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  const goToStep = (step: number) => {
    currentStep.value = step
  }

  return {
    isLoading,
    hasChanges,
    currentStep,
    totalSteps,
    profile,
    goal,
    preferences,
    fetchExistingData,
    saveProfile,
    saveGoal,
    savePreferences,
    completeSetup,
    nextStep,
    prevStep,
    goToStep,
  }
}
