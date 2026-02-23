import type { HealthProfile, HealthGoal, DailyMealPlan, DailyWorkout } from '~/types/health'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

interface MealPlanPromptData {
  profile: HealthProfile
  goal: HealthGoal
  preferences: {
    dietary_restrictions?: string[]
    allergies?: string[]
    liked_foods?: string[]
    disliked_foods?: string[]
    meal_count?: number
    workout_frequency?: number
    workout_duration?: number
  }
  targetCalories: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
}

interface WorkoutPlanPromptData {
  profile: HealthProfile
  goal: HealthGoal
  preferences: {
    dietary_restrictions?: string[]
    allergies?: string[]
    liked_foods?: string[]
    disliked_foods?: string[]
    meal_count?: number
    equipment?: string[]
    workout_style?: string
    workout_frequency?: number
    workout_duration?: number
  }
}

export async function generateMealPlan(data: MealPlanPromptData): Promise<DailyMealPlan[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const { profile, goal, preferences, targetCalories, targetProtein, targetCarbs, targetFat } = data

  const prompt = `Generate a 7-day meal plan for someone with the following profile:

Profile:
- Current weight: ${profile.weight || 'not set'} lbs
- Height: ${profile.height || 'not set'} inches
- Age: ${profile.age || 'not set'}
- Gender: ${profile.gender || 'not set'}
- Activity level: ${profile.activity_level || 'moderate'}

Goal:
- Goal type: ${goal.goal_type} weight
- Target weight: ${goal.target_weight} lbs

Preferences:
- Dietary restrictions: ${preferences.dietary_restrictions?.join(', ') || 'none'}
- Allergies: ${preferences.allergies?.join(', ') || 'none'}
- Liked foods: ${preferences.liked_foods?.join(', ') || 'none'}
- Disliked foods: ${preferences.disliked_foods?.join(', ') || 'none'}
- Meals per day: ${preferences.meal_count || 3}

Target daily macros:
- Calories: ${targetCalories}
- Protein: ${targetProtein}g
- Carbs: ${targetCarbs}g
- Fat: ${targetFat}g

Generate a JSON array of 7 meal plans (one for each day of the week). Each day should have meals for ${preferences.meal_count || 3} meals.

Return ONLY valid JSON, no additional text. Use this exact format:
[{"day": "Monday", "meals": [{"meal_type": "breakfast", "name": "Meal name", "foods": [{"name": "Food", "portion": "1 cup", "calories": 300, "protein": 20, "carbs": 30, "fat": 10}], "total_calories": 600, "total_protein": 40, "total_carbs": 60, "total_fat": 20}], "total_calories": 2000, "total_protein": 150, "total_carbs": 200, "total_fat": 65}]

Days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
Meal types: breakfast, lunch, dinner, snack (use up to ${preferences.meal_count || 3} unique meal types per day)`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a nutritionist and meal planning assistant. Generate detailed, personalized meal plans based on user preferences and goals. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const result = await response.json()
  const content = result.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from OpenAI')
  }

  try {
    const parsed = JSON.parse(content)
    return parsed
  } catch (e) {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse meal plan from AI')
  }
}

export async function generateWorkoutPlan(data: WorkoutPlanPromptData): Promise<DailyWorkout[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const { profile, goal, preferences } = data

  const prompt = `Generate a 7-day workout plan for someone with the following profile:

Profile:
- Current weight: ${profile.weight || 'not set'} lbs
- Height: ${profile.height || 'not set'} inches
- Age: ${profile.age || 'not set'}
- Gender: ${profile.gender || 'not set'}
- Activity level: ${profile.activity_level || 'moderate'}

Goal:
- Goal type: ${goal.goal_type} weight
- Target weight: ${goal.target_weight} lbs

Preferences:
- Available equipment: ${preferences.equipment?.join(', ') || 'bodyweight only'}
- Workout style: ${preferences.workout_style || 'strength'}
- Workout frequency per week: ${preferences.workout_frequency || 4}
- Workout duration: ${preferences.workout_duration || 45} minutes

Generate a 7-day workout plan. Rest days should have light activity only (walking, stretching).

Return ONLY valid JSON, no additional text. Use this exact format:
[{"day": "Monday", "name": "Push Day", "type": "Strength", "exercises": [{"name": "Bench Press", "sets": 3, "reps": "10", "weight": "135 lbs"}, {"name": "Pushups", "sets": 3, "reps": "15"}], "duration_minutes": 45, "estimated_calories": 300}]

Days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
Workout types: Strength, Cardio, HIIT, Flexibility, Rest
Include 4-6 exercises per workout day.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a certified personal trainer and fitness expert. Generate personalized workout plans based on user goals and available equipment. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const result = await response.json()
  const content = result.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from OpenAI')
  }

  try {
    const parsed = JSON.parse(content)
    return parsed
  } catch (e) {
    console.error('Failed to parse AI response:', content)
    throw new Error('Failed to parse workout plan from AI')
  }
}
