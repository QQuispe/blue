import {
  getHealthProfile,
  getActiveHealthGoal,
  getLatestHealthCheckin,
  getHealthCheckins,
  getTodayMeals,
  getActiveMealPlan,
  getActiveWorkoutPlan,
  calculateTargetMacros,
} from '~/server/db/queries/health'
import type { DashboardData, DailyMacros, MacroProgress, Checkin, Meal } from '~/types/api/health'

const formatDateField = (dateVal: any): string => {
  if (!dateVal) return ''
  if (typeof dateVal === 'object' && dateVal.toISOString) {
    return dateVal.toISOString().split('T')[0]
  }
  const str = String(dateVal)
  if (str.includes('T')) {
    return str.split('T')[0]
  }
  return str
}

/**
 * Get comprehensive dashboard data for a user
 */
export async function getDashboardData(userId: number, dateParam?: string): Promise<DashboardData> {
  const profile = await getHealthProfile(userId)
  const activeGoal = await getActiveHealthGoal(userId)
  const latestCheckin = await getLatestHealthCheckin(userId)
  const allCheckins = await getHealthCheckins(userId)
  const todayMeals = await getTodayMeals(userId, dateParam || undefined)

  const todaysMacros: DailyMacros = todayMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + Number(meal.total_calories || 0),
      protein: acc.protein + Number(meal.total_protein || 0),
      carbs: acc.carbs + Number(meal.total_carbs || 0),
      fat: acc.fat + Number(meal.total_fat || 0),
      fiber: acc.fiber, // Fiber not tracked yet
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )

  let targetMacros: DailyMacros = { calories: 2000, protein: 120, carbs: 200, fat: 65, fiber: 30 }
  if (profile && activeGoal) {
    const calculated = await calculateTargetMacros(profile, activeGoal)
    targetMacros = {
      calories: calculated.calories,
      protein: calculated.protein,
      carbs: calculated.carbs,
      fat: calculated.fat,
      fiber: 30,
    }
  }

  const remainingMacros: DailyMacros = {
    calories: Math.max(0, targetMacros.calories - todaysMacros.calories),
    protein: Math.max(0, targetMacros.protein - todaysMacros.protein),
    carbs: Math.max(0, targetMacros.carbs - todaysMacros.carbs),
    fat: Math.max(0, targetMacros.fat - todaysMacros.fat),
    fiber: Math.max(0, targetMacros.fiber - todaysMacros.fiber),
  }

  const macroProgress: MacroProgress = {
    calories: {
      current: todaysMacros.calories,
      target: targetMacros.calories,
      percentage:
        targetMacros.calories > 0
          ? Math.round((todaysMacros.calories / targetMacros.calories) * 100)
          : 0,
    },
    protein: {
      current: todaysMacros.protein,
      target: targetMacros.protein,
      percentage:
        targetMacros.protein > 0
          ? Math.round((todaysMacros.protein / targetMacros.protein) * 100)
          : 0,
    },
    carbs: {
      current: todaysMacros.carbs,
      target: targetMacros.carbs,
      percentage:
        targetMacros.carbs > 0 ? Math.round((todaysMacros.carbs / targetMacros.carbs) * 100) : 0,
    },
    fat: {
      current: todaysMacros.fat,
      target: targetMacros.fat,
      percentage:
        targetMacros.fat > 0 ? Math.round((todaysMacros.fat / targetMacros.fat) * 100) : 0,
    },
  }

  const recentCheckins: Checkin[] = allCheckins.slice(0, 10).map(c => ({
    id: c.id,
    user_id: c.user_id,
    date: formatDateField(c.checkin_date),
    weight: c.weight,
    body_fat: null,
    notes: c.notes,
    created_at: String(c.created_at),
  }))

  const recentMeals: Meal[] = todayMeals.slice(0, 10).map(m => ({
    id: m.id,
    user_id: m.user_id,
    meal_type: m.meal_type,
    meal_date: m.meal_date,
    foods: (m.foods || []).map((f: any) => ({
      id: f.id,
      food_id: f.food_id,
      food_name: f.food_name,
      servings: f.servings,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      type: f.type,
    })),
    total_calories: Number(m.total_calories) || 0,
    total_protein: Number(m.total_protein) || 0,
    total_carbs: Number(m.total_carbs) || 0,
    total_fat: Number(m.total_fat) || 0,
    notes: m.notes,
    created_at: String(m.created_at),
  }))

  return {
    profile: {
      height: profile?.height || null,
      weight: profile?.weight || null,
      goal_weight: activeGoal?.target_weight || null,
      goal_type: activeGoal?.goal_type || null,
      activity_level: profile?.activity_level || null,
      target_calories: activeGoal?.target_calories || null,
      target_protein: activeGoal?.target_protein || null,
      target_carbs: activeGoal?.target_carbs || null,
      target_fat: activeGoal?.target_fat || null,
    },
    activeGoal: activeGoal
      ? {
          id: activeGoal.id,
          goalType: activeGoal.goal_type,
          startingWeight: activeGoal.starting_weight,
          targetWeight: activeGoal.target_weight,
          targetDate: activeGoal.target_date || '',
          weeklyRate: activeGoal.weekly_rate,
        }
      : null,
    latestCheckin: recentCheckins[0] || null,
    todayMeals: recentMeals,
    todaysMacros: todaysMacros,
    targetMacros,
    remainingMacros,
    macroProgress,
    activeMealPlan: null,
    activeWorkoutPlan: null,
    todayWorkout: null,
    progress: {
      weightChange:
        activeGoal && profile ? Number(profile.weight) - Number(activeGoal.starting_weight) : null,
      weeksRemaining: null,
      onTrack: null,
    },
    weightCheckins: recentCheckins.map((c: any) => ({
      id: c.id,
      date: c.date,
      weight: Number(c.weight),
    })) as any[],
    recentCheckins,
    recentMeals,
    activeGoalId: activeGoal?.id || null,
  }
}
