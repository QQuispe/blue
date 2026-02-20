import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  getHealthProfile,
  getActiveHealthGoal,
  getLatestHealthCheckin,
  getTodayMeals,
  getActiveMealPlan,
  getActiveWorkoutPlan,
  calculateTargetMacros,
} from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    const profile = await getHealthProfile(user.id)
    const activeGoal = await getActiveHealthGoal(user.id)
    const latestCheckin = await getLatestHealthCheckin(user.id)
    const todayMeals = await getTodayMeals(user.id)
    const activeMealPlan = await getActiveMealPlan(user.id)
    const activeWorkoutPlan = await getActiveWorkoutPlan(user.id)

    const todayMacros = todayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + Number(meal.total_calories || 0),
        protein: acc.protein + Number(meal.total_protein || 0),
        carbs: acc.carbs + Number(meal.total_carbs || 0),
        fat: acc.fat + Number(meal.total_fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    let targetMacros = { calories: 2000, protein: 120, carbs: 200, fat: 65 }
    if (profile && activeGoal) {
      targetMacros = await calculateTargetMacros(profile, activeGoal)
    }

    let todayWorkout = null
    if (activeWorkoutPlan && activeWorkoutPlan.plan_data) {
      const dayOfWeek = new Date().getDay()
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      todayWorkout =
        activeWorkoutPlan.plan_data.find((d: any) => d.day.toLowerCase() === days[dayOfWeek]) ||
        null
    }

    let weightChange = null
    let weeksRemaining = null
    let onTrack = null

    if (activeGoal && latestCheckin && profile) {
      weightChange = Number(profile.weight) - Number(activeGoal.starting_weight)

      if (activeGoal.target_date) {
        const targetDate = new Date(activeGoal.target_date)
        const today = new Date()
        const weeks = Math.ceil(
          (targetDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)
        )
        weeksRemaining = Math.max(0, weeks)

        const expectedChange =
          activeGoal.goal_type === 'lose'
            ? -(weeks * activeGoal.weekly_rate)
            : weeks * activeGoal.weekly_rate

        onTrack = Math.abs(weightChange - expectedChange) < 5
      }
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, 200, duration, user.id)

    return {
      statusCode: 200,
      dashboard: {
        profile: profile
          ? {
              id: profile.id,
              weight: profile.weight,
              height: profile.height,
              age: profile.age,
              gender: profile.gender,
              activityLevel: profile.activity_level,
            }
          : null,
        activeGoal: activeGoal
          ? {
              id: activeGoal.id,
              goalType: activeGoal.goal_type,
              startingWeight: activeGoal.starting_weight,
              targetWeight: activeGoal.target_weight,
              targetDate: activeGoal.target_date,
              weeklyRate: activeGoal.weekly_rate,
            }
          : null,
        latestCheckin: latestCheckin
          ? {
              id: latestCheckin.id,
              checkinDate: latestCheckin.checkin_date,
              weight: latestCheckin.weight,
            }
          : null,
        todayMeals: todayMeals.map(m => ({
          id: m.id,
          mealType: m.meal_type,
          name: m.name,
          totalCalories: m.total_calories,
          totalProtein: m.total_protein,
          totalCarbs: m.total_carbs,
          totalFat: m.total_fat,
          foods: m.foods || [],
        })),
        todayMacros,
        targetMacros,
        activeMealPlan: activeMealPlan
          ? {
              id: activeMealPlan.id,
              weekStart: activeMealPlan.week_start,
              dailyCalories: activeMealPlan.daily_calories,
              dailyProtein: activeMealPlan.daily_protein,
              dailyCarbs: activeMealPlan.daily_carbs,
              dailyFat: activeMealPlan.daily_fat,
            }
          : null,
        activeWorkoutPlan: activeWorkoutPlan
          ? {
              id: activeWorkoutPlan.id,
              weekStart: activeWorkoutPlan.week_start,
            }
          : null,
        todayWorkout,
        progress: {
          weightChange,
          weeksRemaining,
          onTrack,
        },
      },
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Health dashboard request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch health dashboard',
    })
  }
})
