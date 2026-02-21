<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import Card from '~/components/Card.vue'

const { $toast } = useNuxtApp()

interface MealPlan {
  id: number
  weekStart: string
  dailyCalories: number
  dailyProtein: number
  dailyCarbs: number
  dailyFat: number
  planData: any[]
  isActive: boolean
}

interface WorkoutPlan {
  id: number
  weekStart: string
  planData: any[]
  isActive: boolean
}

const isLoading = ref(true)
const isGenerating = ref(false)
const activeMealPlan = ref<MealPlan | null>(null)
const activeWorkoutPlan = ref<WorkoutPlan | null>(null)
const selectedDay = ref(new Date().getDay())

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const currentDayMeals = computed(() => {
  if (!activeMealPlan.value?.planData) return null
  return activeMealPlan.value.planData[selectedDay.value]
})

const currentDayWorkout = computed(() => {
  if (!activeWorkoutPlan.value?.planData) return null
  return activeWorkoutPlan.value.planData[selectedDay.value]
})

const fetchPlans = async () => {
  try {
    isLoading.value = true

    const [mealRes, workoutRes] = await Promise.all([
      fetch('/api/health/meal-plans', { credentials: 'include' }),
      fetch('/api/health/workout-plans', { credentials: 'include' }),
    ])

    const mealData = await mealRes.json()
    const workoutData = await workoutRes.json()

    activeMealPlan.value = mealData.activePlan
    activeWorkoutPlan.value = workoutData.activePlan
  } catch (err: any) {
    console.error('Error:', err)
  } finally {
    isLoading.value = false
  }
}

const generateMealPlan = async () => {
  try {
    isGenerating.value = true

    const response = await fetch('/api/health/meal-plans/generate', {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || 'Failed to generate')
    }

    const data = await response.json()
    activeMealPlan.value = data.plan
    $toast.success('Meal plan generated!')
  } catch (err: any) {
    $toast.error(err.message || 'Failed to generate meal plan')
  } finally {
    isGenerating.value = false
  }
}

const generateWorkoutPlan = async () => {
  try {
    isGenerating.value = true

    const response = await fetch('/api/health/workout-plans/generate', {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || 'Failed to generate')
    }

    const data = await response.json()
    activeWorkoutPlan.value = data.plan
    $toast.success('Workout plan generated!')
  } catch (err: any) {
    $toast.error(err.message || 'Failed to generate workout plan')
  } finally {
    isGenerating.value = false
  }
}

onMounted(() => {
  fetchPlans()
})
</script>

<template>
  <PageLayout title="Your Plans">
    <div v-if="isLoading" class="loading">Loading...</div>

    <div v-else class="plans-container">
      <!-- Meal Plan Section -->
      <Card>
        <div class="section-header">
          <h2>Meal Plan</h2>
          <button class="btn btn-primary" @click="generateMealPlan" :disabled="isGenerating">
            <Icon name="mdi:refresh" size="18" />
            {{ isGenerating ? 'Generating...' : 'Regenerate' }}
          </button>
        </div>

        <div v-if="activeMealPlan" class="plan-content">
          <div class="day-selector">
            <button
              v-for="(day, index) in days"
              :key="day"
              class="day-btn"
              :class="{ active: selectedDay === index }"
              @click="selectedDay = index"
            >
              {{ day.slice(0, 3) }}
            </button>
          </div>

          <div v-if="currentDayMeals" class="day-content">
            <div class="day-header">
              <h3>{{ days[selectedDay] }}</h3>
              <div class="day-macros">
                <span>{{ currentDayMeals.total_calories }} cal</span>
                <span>P: {{ currentDayMeals.total_protein }}g</span>
                <span>C: {{ currentDayMeals.total_carbs }}g</span>
                <span>F: {{ currentDayMeals.total_fat }}g</span>
              </div>
            </div>

            <div class="meals-grid">
              <div v-for="meal in currentDayMeals.meals" :key="meal.meal_type" class="meal-card">
                <span class="meal-type">{{ meal.meal_type }}</span>
                <div class="meal-foods">
                  <div v-for="food in meal.foods" :key="food.name" class="food-item">
                    <span class="food-name">{{ food.name }}</span>
                    <span class="food-portion">{{ food.portion }}</span>
                  </div>
                </div>
                <div class="meal-calories">{{ meal.total_calories }} cal</div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-plan">
          <Icon name="mdi:food" size="48" />
          <p>No meal plan yet</p>
          <button class="btn btn-primary" @click="generateMealPlan" :disabled="isGenerating">
            Generate Meal Plan
          </button>
        </div>
      </Card>

      <!-- Workout Plan Section -->
      <Card>
        <div class="section-header">
          <h2>Workout Plan</h2>
          <button class="btn btn-primary" @click="generateWorkoutPlan" :disabled="isGenerating">
            <Icon name="mdi:refresh" size="18" />
            {{ isGenerating ? 'Generating...' : 'Regenerate' }}
          </button>
        </div>

        <div v-if="activeWorkoutPlan" class="plan-content">
          <div class="day-selector">
            <button
              v-for="(day, index) in days"
              :key="day"
              class="day-btn"
              :class="{ active: selectedDay === index }"
              @click="selectedDay = index"
            >
              {{ day.slice(0, 3) }}
            </button>
          </div>

          <div v-if="currentDayWorkout" class="workout-content">
            <div class="workout-header">
              <h3>{{ currentDayWorkout.name || days[selectedDay] }}</h3>
              <span class="workout-type">{{ currentDayWorkout.type }}</span>
            </div>

            <div class="workout-duration">
              <Icon name="mdi:clock-outline" size="18" />
              {{ currentDayWorkout.duration_minutes }} minutes
            </div>

            <div class="exercises-list">
              <div
                v-for="exercise in currentDayWorkout.exercises"
                :key="exercise.name"
                class="exercise-item"
              >
                <div class="exercise-name">{{ exercise.name }}</div>
                <div class="exercise-details">
                  <span>{{ exercise.sets }} sets</span>
                  <span>{{ exercise.reps }} reps</span>
                  <span v-if="exercise.weight" class="exercise-weight">{{ exercise.weight }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="rest-day">
            <Icon name="mdi:bed" size="48" />
            <p>Rest Day</p>
            <span>Light walking or stretching recommended</span>
          </div>
        </div>

        <div v-else class="empty-plan">
          <Icon name="mdi:dumbbell" size="48" />
          <p>No workout plan yet</p>
          <button class="btn btn-primary" @click="generateWorkoutPlan" :disabled="isGenerating">
            Generate Workout Plan
          </button>
        </div>
      </Card>
    </div>
  </PageLayout>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-muted);
}

.plans-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.plan-section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.section-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-dark);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.plan-content {
  padding: 20px;
}

.day-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.day-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.day-btn:hover {
  border-color: var(--color-accent);
}

.day-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg-primary);
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.day-header h3 {
  font-size: 1.125rem;
  color: var(--color-text-primary);
}

.day-macros {
  display: flex;
  gap: 16px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.meals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.meal-card {
  background: var(--color-bg-elevated);
  border-radius: 12px;
  padding: 16px;
}

.meal-type {
  display: block;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: capitalize;
  margin-bottom: 12px;
}

.meal-foods {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.food-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.food-name {
  color: var(--color-text-primary);
}

.food-portion {
  color: var(--color-text-muted);
}

.meal-calories {
  font-weight: 600;
  color: var(--color-text-primary);
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.workout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.workout-header h3 {
  font-size: 1.25rem;
  color: var(--color-text-primary);
}

.workout-type {
  color: var(--color-accent);
  font-size: 0.875rem;
}

.workout-duration {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
  margin-bottom: 20px;
}

.exercises-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exercise-item {
  padding: 16px;
  background: var(--color-bg-elevated);
  border-radius: 8px;
}

.exercise-name {
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.exercise-details {
  display: flex;
  gap: 16px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.exercise-weight {
  color: var(--color-accent);
}

.rest-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: var(--color-text-muted);
}

.empty-plan {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
  color: var(--color-text-muted);
}
</style>
