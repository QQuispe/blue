import { useHealthDate } from './useHealthDate'
import { useHealthMacros } from './useHealthMacros'

export interface MealFood {
  id?: number
  food_name: string
  food_id?: number
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface Meal {
  id?: number
  mealType: string
  mealDate: string
  name?: string
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  foods?: MealFood[]
}

export const mealTypes = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

export const useMeals = () => {
  const { selectedDate, getYesterdayDate } = useHealthDate()
  const { setTodaysMacros } = useHealthMacros()
  const { $toast } = useNuxtApp()

  const meals = ref<Meal[]>([])
  const isLoading = ref(false)

  const groupedMeals = computed(() => {
    const grouped: Record<string, Meal[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }

    for (const meal of meals.value) {
      const type = meal.mealType?.toLowerCase() || 'snack'
      if (grouped[type]) {
        grouped[type].push(meal)
      } else {
        grouped.snack.push(meal)
      }
    }

    return Object.entries(grouped).map(([type, meals]) => ({
      mealType: type,
      id: meals[0]?.id,
      foods: meals.flatMap(m => m.foods || []),
      totalCalories: meals.reduce((sum, m) => sum + m.totalCalories, 0),
      totalProtein: meals.reduce((sum, m) => sum + m.totalProtein, 0),
      totalCarbs: meals.reduce((sum, m) => sum + m.totalCarbs, 0),
      totalFat: meals.reduce((sum, m) => sum + m.totalFat, 0),
    }))
  })

  const fetchMeals = async () => {
    try {
      isLoading.value = true
      const response = await fetch(`/api/health/meals?date=${selectedDate.value}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch meals')
      }

      const data = await response.json()
      meals.value = data.meals || []
      setTodaysMacros(meals.value)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const copyMealFromYesterday = async (mealType: string) => {
    const yesterday = getYesterdayDate()
    try {
      const response = await fetch(`/api/health/meals?date=${yesterday}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch yesterday meals')
      const data = await response.json()
      const yesterdayMeal = data.meals?.find((m: any) => m.mealType === mealType)

      if (!yesterdayMeal) {
        $toast?.info(`No ${mealType} logged yesterday`)
        return
      }

      const newMealResponse = await fetch('/api/health/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          meal_type: mealType,
          meal_date: selectedDate.value,
          foods: yesterdayMeal.foods,
        }),
      })

      if (!newMealResponse.ok) throw new Error('Failed to copy meal')

      $toast?.success(`Copied ${mealType} from yesterday`)
      fetchMeals()
    } catch (err) {
      console.error('Error copying meal:', err)
      $toast?.error('Failed to copy meal')
    }
  }

  const saveMeal = async (
    mealType: string,
    foods: MealFood[],
    date: string = selectedDate.value
  ) => {
    if (foods.length === 0) {
      $toast?.error('Add at least one food')
      return { success: false }
    }

    try {
      const response = await fetch('/api/health/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          meal_type: mealType,
          meal_date: date,
          foods,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save meal')
      }

      $toast?.success('Meal logged!')
      fetchMeals()
      return { success: true }
    } catch (err) {
      $toast?.error('Failed to save meal')
      return { success: false }
    }
  }

  const updateMeal = async (
    id: number,
    data: {
      meal_type?: string
      total_calories?: number
      total_protein?: number
      total_carbs?: number
      total_fat?: number
      foods?: any[]
    }
  ) => {
    try {
      const response = await fetch(`/api/health/meals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update meal')
      }

      $toast?.success('Meal updated')
      fetchMeals()
      return { success: true }
    } catch (err) {
      $toast?.error('Failed to update meal')
      return { success: false }
    }
  }

  const deleteMeal = async (meal: Meal) => {
    try {
      await $fetch(`/api/health/meals/${meal.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      $toast?.success('Meal deleted')
      fetchMeals()
    } catch (err) {
      $toast?.error('Failed to delete meal')
    }
  }

  const deleteFoodFromMeal = async (food: MealFood, mealType: string) => {
    if (!food.id) return

    try {
      await $fetch(`/api/health/meal-foods/${food.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      $toast?.success('Food removed')
      fetchMeals()
    } catch (err) {
      console.error('Error deleting food:', err)
      $toast?.error('Failed to remove food')
    }
  }

  const moveFoodToMeal = async (food: MealFood, currentMeal: Meal, newMealType: string) => {
    try {
      const targetMeal = meals.value.find(
        (m: any) => m.mealType === newMealType && m.mealDate === currentMeal.mealDate
      )

      if (targetMeal) {
        await $fetch(`/api/health/meals/${targetMeal.id}`, {
          method: 'PUT',
          credentials: 'include',
          body: {
            meal_type: targetMeal.mealType,
            meal_date: targetMeal.mealDate,
            total_calories: targetMeal.totalCalories + food.calories,
            total_protein: targetMeal.totalProtein + food.protein,
            total_carbs: targetMeal.totalCarbs + food.carbs,
            total_fat: targetMeal.totalFat + food.fat,
            foods: [
              ...(targetMeal.foods || []),
              {
                food_name: food.food_name,
                food_id: food.food_id,
                servings: food.servings,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
              },
            ],
          },
        })
      } else {
        await $fetch('/api/health/meals', {
          method: 'POST',
          credentials: 'include',
          body: {
            meal_type: newMealType,
            meal_date: currentMeal.mealDate,
            foods: [
              {
                food_name: food.food_name,
                food_id: food.food_id,
                servings: food.servings,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
              },
            ],
          },
        })
      }

      if (food.id) {
        await $fetch(`/api/health/meal-foods/${food.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      }

      $toast?.success(`Moved to ${newMealType}`)
      fetchMeals()
    } catch (err) {
      console.error('Failed to move food:', err)
      $toast?.error('Failed to move food')
    }
  }

  return {
    meals,
    isLoading,
    groupedMeals,
    mealTypes,
    fetchMeals,
    copyMealFromYesterday,
    saveMeal,
    updateMeal,
    deleteMeal,
    deleteFoodFromMeal,
    moveFoodToMeal,
  }
}
