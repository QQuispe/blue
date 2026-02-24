import { pool } from '../index.js'
import type { QueryResult, QueryResultArray } from '~/types/database.js'
import type {
  HealthProfile,
  HealthGoal,
  HealthCheckin,
  HealthFood,
  HealthMeal,
  HealthMealFood,
  HealthPreferences,
  HealthMealPlan,
  HealthWorkoutPlan,
  HealthWorkoutSession,
  HealthSavedMealInput,
} from '~/types/health.js'

export async function getHealthProfile(userId: number): Promise<QueryResult<HealthProfile>> {
  const result = await pool.query(`SELECT * FROM health_profiles WHERE user_id = $1`, [userId])
  return result.rows[0] || null
}

export async function createHealthProfile(
  userId: number,
  profile: Partial<HealthProfile>
): Promise<HealthProfile> {
  const result = await pool.query(
    `INSERT INTO health_profiles (user_id, weight, height, age, gender, activity_level)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       weight = COALESCE($2, health_profiles.weight),
       height = COALESCE($3, health_profiles.height),
       age = COALESCE($4, health_profiles.age),
       gender = COALESCE($5, health_profiles.gender),
       activity_level = COALESCE($6, health_profiles.activity_level),
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      userId,
      profile.weight || null,
      profile.height || null,
      profile.age || null,
      profile.gender || null,
      profile.activity_level || 'moderate',
    ]
  )
  return result.rows[0]
}

export async function updateHealthProfile(
  userId: number,
  profile: Partial<HealthProfile>
): Promise<QueryResult<HealthProfile>> {
  const fields: string[] = []
  const values: any[] = [userId]
  let paramCount = 2

  if (profile.weight !== undefined) {
    fields.push(`weight = $${paramCount++}`)
    values.push(profile.weight)
  }
  if (profile.height !== undefined) {
    fields.push(`height = $${paramCount++}`)
    values.push(profile.height)
  }
  if (profile.age !== undefined) {
    fields.push(`age = $${paramCount++}`)
    values.push(profile.age)
  }
  if (profile.gender !== undefined) {
    fields.push(`gender = $${paramCount++}`)
    values.push(profile.gender)
  }
  if (profile.activity_level !== undefined) {
    fields.push(`activity_level = $${paramCount++}`)
    values.push(profile.activity_level)
  }

  if (fields.length === 0) return getHealthProfile(userId)

  fields.push('updated_at = CURRENT_TIMESTAMP')

  const result = await pool.query(
    `UPDATE health_profiles SET ${fields.join(', ')} WHERE user_id = $1 RETURNING *`,
    values
  )
  return result.rows[0] || null
}

export async function getActiveHealthGoal(userId: number): Promise<QueryResult<HealthGoal>> {
  const result = await pool.query(
    `SELECT * FROM health_goals WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    [userId]
  )
  return result.rows[0] || null
}

export async function getAllHealthGoals(userId: number): Promise<HealthGoal[]> {
  const result = await pool.query(
    `SELECT * FROM health_goals WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  )
  return result.rows
}

export async function createHealthGoal(
  userId: number,
  goal: Partial<HealthGoal>
): Promise<HealthGoal> {
  await pool.query(
    `UPDATE health_goals SET is_active = false WHERE user_id = $1 AND is_active = true`,
    [userId]
  )

  const result = await pool.query(
    `INSERT INTO health_goals (user_id, goal_type, starting_weight, target_weight, target_date, weekly_rate)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      goal.goal_type,
      goal.starting_weight,
      goal.target_weight,
      goal.target_date || null,
      goal.weekly_rate || 0.5,
    ]
  )
  return result.rows[0]
}

export async function updateHealthGoal(
  goalId: number,
  goal: Partial<HealthGoal>
): Promise<QueryResult<HealthGoal>> {
  const fields: string[] = []
  const values: any[] = [goalId]
  let paramCount = 2

  if (goal.goal_type !== undefined) {
    fields.push(`goal_type = $${paramCount++}`)
    values.push(goal.goal_type)
  }
  if (goal.target_weight !== undefined) {
    fields.push(`target_weight = $${paramCount++}`)
    values.push(goal.target_weight)
  }
  if (goal.target_date !== undefined) {
    fields.push(`target_date = $${paramCount++}`)
    values.push(goal.target_date)
  }
  if (goal.weekly_rate !== undefined) {
    fields.push(`weekly_rate = $${paramCount++}`)
    values.push(goal.weekly_rate)
  }
  if (goal.is_active !== undefined) {
    fields.push(`is_active = $${paramCount++}`)
    values.push(goal.is_active)
  }
  if (goal.target_calories !== undefined) {
    fields.push(`target_calories = $${paramCount++}`)
    values.push(goal.target_calories)
  }
  if (goal.target_protein !== undefined) {
    fields.push(`target_protein = $${paramCount++}`)
    values.push(goal.target_protein)
  }
  if (goal.target_carbs !== undefined) {
    fields.push(`target_carbs = $${paramCount++}`)
    values.push(goal.target_carbs)
  }
  if (goal.target_fat !== undefined) {
    fields.push(`target_fat = $${paramCount++}`)
    values.push(goal.target_fat)
  }

  if (fields.length === 0) return null

  fields.push('updated_at = CURRENT_TIMESTAMP')

  const result = await pool.query(
    `UPDATE health_goals SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    values
  )
  return result.rows[0] || null
}

export async function getHealthCheckins(
  userId: number,
  limit: number = 30
): Promise<HealthCheckin[]> {
  const result = await pool.query(
    `SELECT * FROM health_checkins WHERE user_id = $1 ORDER BY checkin_date DESC LIMIT $2`,
    [userId, limit]
  )
  return result.rows
}

export async function getLatestHealthCheckin(userId: number): Promise<QueryResult<HealthCheckin>> {
  const result = await pool.query(
    `SELECT * FROM health_checkins WHERE user_id = $1 ORDER BY checkin_date DESC LIMIT 1`,
    [userId]
  )
  return result.rows[0] || null
}

export async function createHealthCheckin(
  userId: number,
  checkin: Partial<HealthCheckin>
): Promise<HealthCheckin> {
  const result = await pool.query(
    `INSERT INTO health_checkins (user_id, checkin_date, weight, chest, waist, hips, biceps, thighs, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, checkin_date) DO UPDATE SET
       weight = COALESCE($3, health_checkins.weight),
       chest = COALESCE($4, health_checkins.chest),
       waist = COALESCE($5, health_checkins.waist),
       hips = COALESCE($6, health_checkins.hips),
       biceps = COALESCE($7, health_checkins.biceps),
       thighs = COALESCE($8, health_checkins.thighs),
       notes = COALESCE($9, health_checkins.notes)
     RETURNING *`,
    [
      userId,
      checkin.checkin_date || new Date().toISOString().split('T')[0],
      checkin.weight || null,
      checkin.chest || null,
      checkin.waist || null,
      checkin.hips || null,
      checkin.biceps || null,
      checkin.thighs || null,
      checkin.notes || null,
    ]
  )
  return result.rows[0]
}

export async function searchHealthFoods(query: string, limit: number = 20): Promise<HealthFood[]> {
  const result = await pool.query(
    `SELECT * FROM health_foods 
     WHERE name ILIKE $1 
     ORDER BY is_verified DESC, name ASC 
     LIMIT $2`,
    [`%${query}%`, limit]
  )
  return result.rows
}

export async function getHealthFoodByBarcode(barcode: string): Promise<QueryResult<HealthFood>> {
  const result = await pool.query(`SELECT * FROM health_foods WHERE barcode = $1`, [barcode])
  return result.rows[0] || null
}

export async function createHealthFood(food: Partial<HealthFood>): Promise<HealthFood> {
  const result = await pool.query(
    `INSERT INTO health_foods (name, brand, barcode, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, sodium, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      food.name,
      food.brand || null,
      food.barcode || null,
      food.serving_size || 1,
      food.serving_unit || 'serving',
      food.calories || 0,
      food.protein || 0,
      food.carbs || 0,
      food.fat || 0,
      food.fiber || null,
      food.sugar || null,
      food.sodium || null,
      food.source || 'manual',
    ]
  )
  return result.rows[0]
}

export async function getTodayMeals(userId: number, date?: string): Promise<HealthMeal[]> {
  const targetDate = date || new Date().toISOString().split('T')[0]
  const result = await pool.query(
    `SELECT m.*, 
            COALESCE(json_agg(
              DISTINCT jsonb_build_object(
                'id', mf.id,
                'meal_id', mf.meal_id,
                'food_id', mf.food_id,
                'food_name', mf.food_name,
                'servings', mf.servings,
                'calories', mf.calories,
                'protein', mf.protein,
                'carbs', mf.carbs,
                'fat', mf.fat
              )
            ) FILTER (WHERE mf.id IS NOT NULL), '[]') as foods
     FROM health_meals m
     LEFT JOIN health_meal_foods mf ON m.id = mf.meal_id
     WHERE m.user_id = $1 AND m.meal_date = $2
     GROUP BY m.id
     ORDER BY m.created_at ASC`,
    [userId, targetDate]
  )
  return result.rows
}

export async function getMealsByDate(userId: number, date: string): Promise<HealthMeal[]> {
  const result = await pool.query(
    `SELECT m.*, 
            COALESCE(json_agg(
              DISTINCT jsonb_build_object(
                'id', mf.id,
                'meal_id', mf.meal_id,
                'food_id', mf.food_id,
                'food_name', mf.food_name,
                'servings', mf.servings,
                'calories', mf.calories,
                'protein', mf.protein,
                'carbs', mf.carbs,
                'fat', mf.fat
              )
            ) FILTER (WHERE mf.id IS NOT NULL), '[]') as foods
     FROM health_meals m
     LEFT JOIN health_meal_foods mf ON m.id = mf.meal_id
     WHERE m.user_id = $1 AND m.meal_date = $2
     GROUP BY m.id
     ORDER BY m.created_at ASC`,
    [userId, date]
  )
  return result.rows
}

export async function getRecentFoods(userId: number, limit = 10): Promise<any[]> {
  const result = await pool.query(
    `SELECT DISTINCT ON (mf.food_name)
            mf.food_name,
            mf.food_id,
            mf.calories / NULLIF(mf.servings, 0) as calories,
            mf.protein / NULLIF(mf.servings, 0) as protein,
            mf.carbs / NULLIF(mf.servings, 0) as carbs,
            mf.fat / NULLIF(mf.servings, 0) as fat,
            mf.servings as last_servings,
            m.meal_date,
            m.meal_type
     FROM health_meal_foods mf
     JOIN health_meals m ON mf.meal_id = m.id
     WHERE m.user_id = $1
     ORDER BY mf.food_name, m.meal_date DESC
     LIMIT $2`,
    [userId, limit]
  )
  return result.rows
}

export async function getCustomFoods(userId: number): Promise<HealthFood[]> {
  const result = await pool.query(
    `SELECT * FROM health_foods WHERE user_id = $1 AND source = 'custom' ORDER BY name ASC`,
    [userId]
  )
  return result.rows
}

export async function createCustomFood(
  userId: number,
  food: Partial<HealthFood>
): Promise<HealthFood> {
  const result = await pool.query(
    `INSERT INTO health_foods (user_id, name, brand, serving_size, serving_unit, calories, protein, carbs, fat, fiber, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'custom')
     RETURNING *`,
    [
      userId,
      food.name,
      food.brand || null,
      food.serving_size || 100,
      food.serving_unit || 'g',
      food.calories || 0,
      food.protein || 0,
      food.carbs || 0,
      food.fat || 0,
      food.fiber || 0,
    ]
  )
  return result.rows[0]
}

export async function deleteCustomFood(foodId: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM health_foods WHERE id = $1 AND user_id = $2 AND source = 'custom' RETURNING id`,
    [foodId, userId]
  )
  return result.rows.length > 0
}

export async function createHealthMeal(
  userId: number,
  meal: Partial<HealthMeal>,
  foods: Partial<HealthMealFood>[]
): Promise<HealthMeal> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const mealResult = await client.query(
      `INSERT INTO health_meals (user_id, meal_type, meal_date, name, notes, total_calories, total_protein, total_carbs, total_fat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        meal.meal_type,
        meal.meal_date || new Date().toISOString().split('T')[0],
        meal.name || null,
        meal.notes || null,
        meal.total_calories || 0,
        meal.total_protein || 0,
        meal.total_carbs || 0,
        meal.total_fat || 0,
      ]
    )

    const mealId = mealResult.rows[0].id

    if (foods.length > 0) {
      for (const food of foods) {
        await client.query(
          `INSERT INTO health_meal_foods (meal_id, food_id, food_name, servings, calories, protein, carbs, fat)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            mealId,
            food.food_id || null,
            food.food_name,
            food.servings || 1,
            food.calories || 0,
            food.protein || 0,
            food.carbs || 0,
            food.fat || 0,
          ]
        )
      }
    }

    await client.query('COMMIT')
    return mealResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteHealthMeal(mealId: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM health_meals WHERE id = $1 AND user_id = $2 RETURNING id`,
    [mealId, userId]
  )
  return !!result.rows[0]
}

export async function updateHealthMeal(
  mealId: number,
  userId: number,
  meal: Partial<HealthMeal>,
  foods: Partial<HealthMealFood>[]
): Promise<HealthMeal> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE health_meals SET 
        meal_type = $1, 
        total_calories = $2, 
        total_protein = $3, 
        total_carbs = $4, 
        total_fat = $5
       WHERE id = $6 AND user_id = $7`,
      [
        meal.meal_type,
        meal.total_calories || 0,
        meal.total_protein || 0,
        meal.total_carbs || 0,
        meal.total_fat || 0,
        mealId,
        userId,
      ]
    )

    await client.query(`DELETE FROM health_meal_foods WHERE meal_id = $1`, [mealId])

    if (foods.length > 0) {
      for (const food of foods) {
        await client.query(
          `INSERT INTO health_meal_foods (meal_id, food_id, food_name, servings, calories, protein, carbs, fat)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            mealId,
            food.food_id || null,
            food.food_name,
            food.servings || 1,
            food.calories || 0,
            food.protein || 0,
            food.carbs || 0,
            food.fat || 0,
          ]
        )
      }
    }

    const result = await client.query(`SELECT * FROM health_meals WHERE id = $1`, [mealId])

    await client.query('COMMIT')

    return result.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getHealthPreferences(
  userId: number
): Promise<QueryResult<HealthPreferences>> {
  const result = await pool.query(`SELECT * FROM health_preferences WHERE user_id = $1`, [userId])
  return result.rows[0] || null
}

export async function createHealthPreferences(
  userId: number,
  prefs: Partial<HealthPreferences>
): Promise<HealthPreferences> {
  const result = await pool.query(
    `INSERT INTO health_preferences (user_id, dietary_restrictions, allergies, liked_foods, disliked_foods, meal_count, equipment, workout_style, workout_frequency, workout_duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id) DO UPDATE SET
       dietary_restrictions = COALESCE($2, health_preferences.dietary_restrictions),
       allergies = COALESCE($3, health_preferences.allergies),
       liked_foods = COALESCE($4, health_preferences.liked_foods),
       disliked_foods = COALESCE($5, health_preferences.disliked_foods),
       meal_count = COALESCE($6, health_preferences.meal_count),
       equipment = COALESCE($7, health_preferences.equipment),
       workout_style = COALESCE($8, health_preferences.workout_style),
       workout_frequency = COALESCE($9, health_preferences.workout_frequency),
       workout_duration = COALESCE($10, health_preferences.workout_duration),
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      userId,
      prefs.dietary_restrictions || [],
      prefs.allergies || [],
      prefs.liked_foods || [],
      prefs.disliked_foods || [],
      prefs.meal_count || 3,
      prefs.equipment || [],
      prefs.workout_style || null,
      prefs.workout_frequency || 4,
      prefs.workout_duration || 45,
    ]
  )
  return result.rows[0]
}

export async function getActiveMealPlan(userId: number): Promise<QueryResult<HealthMealPlan>> {
  const result = await pool.query(
    `SELECT * FROM health_meal_plans WHERE user_id = $1 AND is_active = true ORDER BY week_start DESC LIMIT 1`,
    [userId]
  )
  return result.rows[0] || null
}

export async function getMealPlans(userId: number, limit: number = 10): Promise<HealthMealPlan[]> {
  const result = await pool.query(
    `SELECT * FROM health_meal_plans WHERE user_id = $1 ORDER BY week_start DESC LIMIT $2`,
    [userId, limit]
  )
  return result.rows
}

export async function createHealthMealPlan(
  userId: number,
  plan: Partial<HealthMealPlan>
): Promise<HealthMealPlan> {
  await pool.query(
    `UPDATE health_meal_plans SET is_active = false WHERE user_id = $1 AND is_active = true`,
    [userId]
  )

  const result = await pool.query(
    `INSERT INTO health_meal_plans (user_id, week_start, plan_data, daily_calories, daily_protein, daily_carbs, daily_fat, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [
      userId,
      plan.week_start,
      JSON.stringify(plan.plan_data),
      plan.daily_calories || 0,
      plan.daily_protein || 0,
      plan.daily_carbs || 0,
      plan.daily_fat || 0,
    ]
  )
  return result.rows[0]
}

export async function getActiveWorkoutPlan(
  userId: number
): Promise<QueryResult<HealthWorkoutPlan>> {
  const result = await pool.query(
    `SELECT * FROM health_workout_plans WHERE user_id = $1 AND is_active = true ORDER BY week_start DESC LIMIT 1`,
    [userId]
  )
  return result.rows[0] || null
}

export async function getWorkoutPlans(
  userId: number,
  limit: number = 10
): Promise<HealthWorkoutPlan[]> {
  const result = await pool.query(
    `SELECT * FROM health_workout_plans WHERE user_id = $1 ORDER BY week_start DESC LIMIT $2`,
    [userId, limit]
  )
  return result.rows
}

export async function createHealthWorkoutPlan(
  userId: number,
  plan: Partial<HealthWorkoutPlan>
): Promise<HealthWorkoutPlan> {
  await pool.query(
    `UPDATE health_workout_plans SET is_active = false WHERE user_id = $1 AND is_active = true`,
    [userId]
  )

  const result = await pool.query(
    `INSERT INTO health_workout_plans (user_id, week_start, plan_data, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING *`,
    [userId, plan.week_start, JSON.stringify(plan.plan_data)]
  )
  return result.rows[0]
}

export async function getTodayWorkoutSession(
  userId: number
): Promise<QueryResult<HealthWorkoutSession>> {
  const today = new Date().toISOString().split('T')[0]
  const result = await pool.query(
    `SELECT * FROM health_workout_sessions WHERE user_id = $1 AND session_date = $2 LIMIT 1`,
    [userId, today]
  )
  return result.rows[0] || null
}

export async function createHealthWorkoutSession(
  userId: number,
  session: Partial<HealthWorkoutSession>
): Promise<HealthWorkoutSession> {
  const result = await pool.query(
    `INSERT INTO health_workout_sessions (user_id, workout_plan_id, session_date, workout_data, duration_minutes, notes, completed)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      userId,
      session.workout_plan_id || null,
      session.session_date || new Date().toISOString().split('T')[0],
      session.workout_data ? JSON.stringify(session.workout_data) : null,
      session.duration_minutes || null,
      session.notes || null,
      session.completed ?? true,
    ]
  )
  return result.rows[0]
}

export async function calculateBMR(profile: HealthProfile): Promise<number> {
  const weight = Number(profile.weight) || 70
  const height = Number(profile.height) || 170
  const age = Number(profile.age) || 30

  if (profile.gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5)
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161)
}

export async function calculateTDEE(profile: HealthProfile): Promise<number> {
  const bmr = await calculateBMR(profile)

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }

  const multiplier = multipliers[profile.activity_level] || 1.55
  return Math.round(bmr * multiplier)
}

export async function calculateTargetMacros(
  profile: HealthProfile,
  goal: HealthGoal
): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
  if (goal.target_calories || goal.target_protein || goal.target_carbs || goal.target_fat) {
    return {
      calories: Number(goal.target_calories) || 2000,
      protein: Number(goal.target_protein) || 120,
      carbs: Number(goal.target_carbs) || 200,
      fat: Number(goal.target_fat) || 65,
    }
  }

  const tdee = await calculateTDEE(profile)

  let calories: number
  if (goal.goal_type === 'lose') {
    calories = Math.round(tdee - 500)
  } else if (goal.goal_type === 'gain') {
    calories = Math.round(tdee + 300)
  } else {
    calories = tdee
  }

  const weight = profile.weight || 70
  const protein = Math.round(weight * 1.8)
  const fat = Math.round(weight * 0.8)
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4)

  return {
    calories,
    protein: Math.max(protein, 50),
    carbs: Math.max(carbs, 50),
    fat: Math.max(fat, 20),
  }
}

export async function getSavedMeals(userId: number) {
  const result = await pool.query(
    `SELECT * FROM health_saved_meals WHERE user_id = $1 ORDER BY is_favorite DESC, created_at DESC`,
    [userId]
  )
  return result.rows
}

export async function getSavedMealById(id: number, userId: number) {
  const result = await pool.query(
    `SELECT * FROM health_saved_meals WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
  return result.rows[0] || null
}

export async function createSavedMeal(userId: number, meal: HealthSavedMealInput) {
  const result = await pool.query(
    `INSERT INTO health_saved_meals (user_id, name, meal_type, calories, protein, carbs, fat, fiber, ingredients, instructions, source, usda_fdc_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      userId,
      meal.name,
      meal.meal_type || null,
      meal.calories || null,
      meal.protein || null,
      meal.carbs || null,
      meal.fat || null,
      meal.fiber || null,
      meal.ingredients ? JSON.stringify(meal.ingredients) : null,
      meal.instructions || null,
      meal.source || 'custom',
      meal.usda_fdc_id || null,
    ]
  )
  return result.rows[0]
}

export async function updateSavedMeal(
  id: number,
  userId: number,
  meal: Partial<HealthSavedMealInput>
) {
  const fields: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (meal.name !== undefined) {
    fields.push(`name = $${paramCount++}`)
    values.push(meal.name)
  }
  if (meal.meal_type !== undefined) {
    fields.push(`meal_type = $${paramCount++}`)
    values.push(meal.meal_type)
  }
  if (meal.calories !== undefined) {
    fields.push(`calories = $${paramCount++}`)
    values.push(meal.calories)
  }
  if (meal.protein !== undefined) {
    fields.push(`protein = $${paramCount++}`)
    values.push(meal.protein)
  }
  if (meal.carbs !== undefined) {
    fields.push(`carbs = $${paramCount++}`)
    values.push(meal.carbs)
  }
  if (meal.fat !== undefined) {
    fields.push(`fat = $${paramCount++}`)
    values.push(meal.fat)
  }
  if (meal.fiber !== undefined) {
    fields.push(`fiber = $${paramCount++}`)
    values.push(meal.fiber)
  }
  if (meal.ingredients !== undefined) {
    fields.push(`ingredients = $${paramCount++}`)
    values.push(meal.ingredients ? JSON.stringify(meal.ingredients) : null)
  }
  if (meal.instructions !== undefined) {
    fields.push(`instructions = $${paramCount++}`)
    values.push(meal.instructions)
  }
  if (meal.is_favorite !== undefined) {
    fields.push(`is_favorite = $${paramCount++}`)
    values.push(meal.is_favorite)
  }

  if (fields.length === 0) return null

  fields.push(`updated_at = NOW()`)
  values.push(id, userId)

  const result = await pool.query(
    `UPDATE health_saved_meals SET ${fields.join(', ')} WHERE id = $${paramCount++} AND user_id = $${paramCount} RETURNING *`,
    values
  )
  return result.rows[0]
}

export async function deleteSavedMeal(id: number, userId: number) {
  const result = await pool.query(
    `DELETE FROM health_saved_meals WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  )
  return result.rows[0]
}

export async function toggleSavedMealFavorite(id: number, userId: number) {
  const existing = await pool.query(
    `SELECT * FROM health_saved_meals WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )

  if (!existing.rows[0]) return null

  const meal = existing.rows[0]

  if (meal.is_favorite) {
    await pool.query(
      `UPDATE health_saved_meals SET is_favorite = false, updated_at = NOW() WHERE id = $1`,
      [id]
    )
    return { ...meal, is_favorite: false }
  }

  const result = await pool.query(
    `INSERT INTO health_saved_meals (user_id, name, meal_type, calories, protein, carbs, fat, fiber, ingredients, instructions, source, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
     RETURNING *`,
    [
      userId,
      meal.name + ' (Favorite)',
      meal.meal_type,
      meal.calories,
      meal.protein,
      meal.carbs,
      meal.fat,
      meal.fiber,
      meal.ingredients,
      meal.instructions,
      meal.source,
    ]
  )
  return result.rows[0]
}
