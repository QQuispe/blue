import type { ApiSuccess } from '~/types/api/common'
import type { HealthProfile, HealthGoal } from '~/types/health'

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
        $fetch<ApiSuccess<{ profile: HealthProfile }>>('/api/v1/health/profile', {
          credentials: 'include',
        }),
        $fetch<ApiSuccess<{ goals: HealthGoal[] }>>('/api/v1/health/goals', {
          credentials: 'include',
        }),
        $fetch<ApiSuccess<any>>('/api/v1/health/preferences', { credentials: 'include' }),
      ])

      if (profileRes.data.profile) {
        profile.value = {
          weight: profileRes.data.profile.weight,
          height: profileRes.data.profile.height,
          age: profileRes.data.profile.age,
          gender: profileRes.data.profile.gender,
          activityLevel: profileRes.data.profile.activity_level || 'moderate',
        }
      }

      const activeGoal =
        goalRes.data.goals?.find((g: HealthGoal) => g.is_active) || goalRes.data.goals?.[0]
      if (activeGoal) {
        goal.value = {
          goalType: activeGoal.goal_type,
          startingWeight: activeGoal.starting_weight,
          targetWeight: activeGoal.target_weight,
          targetDate: activeGoal.target_date,
          weeklyRate: activeGoal.weekly_rate,
          targetCalories: activeGoal.target_calories,
          targetProtein: activeGoal.target_protein,
          targetCarbs: activeGoal.target_carbs,
          targetFat: activeGoal.target_fat,
        }
      }

      const prefs = prefsRes.data?.preferences || prefsRes.data
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
      await $fetch('/api/v1/health/profile', {
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
      const existingGoals = await $fetch<ApiSuccess<{ goals: HealthGoal[] }>>(
        '/api/v1/health/goals',
        { credentials: 'include' }
      )
      const activeGoal =
        existingGoals.data.goals?.find((g: HealthGoal) => g.is_active) ||
        existingGoals.data.goals?.[0]

      if (activeGoal) {
        await $fetch<ApiSuccess<{ goal: HealthGoal }>>(`/api/v1/health/goals/${activeGoal.id}`, {
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
        await $fetch<ApiSuccess<{ goal: HealthGoal }>>('/api/v1/health/goals', {
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
      await $fetch('/api/v1/health/preferences', {
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
