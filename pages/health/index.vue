<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const { $toast } = useNuxtApp()

interface DashboardData {
  profile: any
  activeGoal: any
  latestCheckin: any
  todayMeals: any[]
  todayMacros: { calories: number; protein: number; carbs: number; fat: number }
  targetMacros: { calories: number; protein: number; carbs: number; fat: number }
  activeMealPlan: any
  activeWorkoutPlan: any
  todayWorkout: any
  progress: { weightChange: number | null; weeksRemaining: number | null; onTrack: boolean | null }
}

const isLoading = ref(true)
const dashboard = ref<DashboardData | null>(null)

const fetchDashboard = async () => {
  try {
    isLoading.value = true
    const response = await fetch('/api/health/dashboard', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard')
    }

    const data = await response.json()
    dashboard.value = data.dashboard
  } catch (err: any) {
    console.error('Dashboard error:', err)
  } finally {
    isLoading.value = false
  }
}

const needsSetup = computed(() => {
  return !dashboard.value?.profile || !dashboard.value?.activeGoal
})

const caloriesProgress = computed(() => {
  if (!dashboard.value) return 0
  const target = dashboard.value.targetMacros.calories
  const current = dashboard.value.todayMacros.calories
  return Math.min((current / target) * 100, 100)
})

const proteinProgress = computed(() => {
  if (!dashboard.value) return 0
  const target = dashboard.value.targetMacros.protein
  const current = dashboard.value.todayMacros.protein
  return Math.min((current / target) * 100, 100)
})

const carbsProgress = computed(() => {
  if (!dashboard.value) return 0
  const target = dashboard.value.targetMacros.carbs
  const current = dashboard.value.todayMacros.carbs
  return Math.min((current / target) * 100, 100)
})

const fatProgress = computed(() => {
  if (!dashboard.value) return 0
  const target = dashboard.value.targetMacros.fat
  const current = dashboard.value.todayMacros.fat
  return Math.min((current / target) * 100, 100)
})

const formatNumber = (num: number, decimals = 0) => {
  return num.toFixed(decimals)
}

const getDayName = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
}

onMounted(() => {
  fetchDashboard()
})
</script>

<template>
  <div class="health-page">
    <div class="page-header">
      <h1>Health Dashboard</h1>
      <p v-if="dashboard?.activeGoal">
        Goal:
        {{
          dashboard.activeGoal.goalType === 'lose'
            ? 'Lose'
            : dashboard.activeGoal.goalType === 'gain'
              ? 'Gain'
              : 'Maintain'
        }}
        {{ dashboard.activeGoal.targetWeight }} lbs
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="skeleton-cards">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    </div>

    <!-- Needs Setup -->
    <div v-else-if="needsSetup" class="setup-prompt">
      <div class="setup-card">
        <div class="setup-icon">
          <Icon name="mdi:heart-pulse" size="48" />
        </div>
        <h2>Welcome to Health Tracking</h2>
        <p>Set up your profile and goals to get started</p>
        <NuxtLink to="/health/setup" class="btn btn-primary"> Start Setup </NuxtLink>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-grid">
      <!-- Quick Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon weight">
            <Icon name="mdi:scale-bathroom" size="24" />
          </div>
          <div class="stat-content">
            <span class="stat-label">Current Weight</span>
            <span class="stat-value">{{ dashboard?.profile?.weight || '--' }} lbs</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon goal">
            <Icon name="mdi:flag" size="24" />
          </div>
          <div class="stat-content">
            <span class="stat-label">Target Weight</span>
            <span class="stat-value">{{ dashboard?.activeGoal?.targetWeight || '--' }} lbs</span>
          </div>
        </div>

        <div class="stat-card">
          <div
            class="stat-icon change"
            :class="
              dashboard?.progress?.weightChange && dashboard.progress.weightChange < 0
                ? 'negative'
                : ''
            "
          >
            <Icon
              :name="
                dashboard?.progress?.weightChange && dashboard.progress.weightChange < 0
                  ? 'mdi:trending-down'
                  : 'mdi:trending-up'
              "
              size="24"
            />
          </div>
          <div class="stat-content">
            <span class="stat-label">Weight Change</span>
            <span class="stat-value">
              {{
                dashboard?.progress?.weightChange
                  ? (dashboard.progress.weightChange > 0 ? '+' : '') +
                    formatNumber(dashboard.progress.weightChange, 1)
                  : '--'
              }}
              lbs
            </span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon time">
            <Icon name="mdi:calendar-clock" size="24" />
          </div>
          <div class="stat-content">
            <span class="stat-label">Weeks Remaining</span>
            <span class="stat-value">{{ dashboard?.progress?.weeksRemaining ?? '--' }}</span>
          </div>
        </div>
      </div>

      <!-- Macros -->
      <div class="section-card macros-card">
        <div class="section-header">
          <h2>Today's Macros</h2>
          <NuxtLink to="/health/meals" class="view-link">Log Meals</NuxtLink>
        </div>

        <div class="macros-grid">
          <div class="macro-item">
            <div class="macro-header">
              <span class="macro-label">Calories</span>
              <span class="macro-value"
                >{{ formatNumber(dashboard?.todayMacros?.calories || 0) }} /
                {{ dashboard?.targetMacros?.calories || 2000 }}</span
              >
            </div>
            <div class="macro-bar">
              <div class="macro-fill calories" :style="{ width: `${caloriesProgress}%` }"></div>
            </div>
          </div>

          <div class="macro-item">
            <div class="macro-header">
              <span class="macro-label">Protein</span>
              <span class="macro-value"
                >{{ formatNumber(dashboard?.todayMacros?.protein || 0) }}g /
                {{ dashboard?.targetMacros?.protein || 120 }}g</span
              >
            </div>
            <div class="macro-bar">
              <div class="macro-fill protein" :style="{ width: `${proteinProgress}%` }"></div>
            </div>
          </div>

          <div class="macro-item">
            <div class="macro-header">
              <span class="macro-label">Carbs</span>
              <span class="macro-value"
                >{{ formatNumber(dashboard?.todayMacros?.carbs || 0) }}g /
                {{ dashboard?.targetMacros?.carbs || 200 }}g</span
              >
            </div>
            <div class="macro-bar">
              <div class="macro-fill carbs" :style="{ width: `${carbsProgress}%` }"></div>
            </div>
          </div>

          <div class="macro-item">
            <div class="macro-header">
              <span class="macro-label">Fat</span>
              <span class="macro-value"
                >{{ formatNumber(dashboard?.todayMacros?.fat || 0) }}g /
                {{ dashboard?.targetMacros?.fat || 65 }}g</span
              >
            </div>
            <div class="macro-bar">
              <div class="macro-fill fat" :style="{ width: `${fatProgress}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Today's Meals -->
      <div class="section-card meals-card">
        <div class="section-header">
          <h2>Today's Meals</h2>
          <NuxtLink to="/health/meals" class="view-link">View All</NuxtLink>
        </div>

        <div class="meals-list" v-if="dashboard?.todayMeals?.length">
          <div v-for="meal in dashboard.todayMeals" :key="meal.id" class="meal-item">
            <div class="meal-info">
              <span class="meal-type">{{ meal.mealType }}</span>
              <span class="meal-calories">{{ formatNumber(meal.totalCalories) }} cal</span>
            </div>
            <div class="meal-macros">
              <span>P: {{ formatNumber(meal.totalProtein) }}g</span>
              <span>C: {{ formatNumber(meal.totalCarbs) }}g</span>
              <span>F: {{ formatNumber(meal.totalFat) }}g</span>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <Icon name="mdi:food-off" size="32" />
          <p>No meals logged today</p>
          <NuxtLink to="/health/meals" class="btn btn-sm">Log Meal</NuxtLink>
        </div>
      </div>

      <!-- Today's Workout -->
      <div class="section-card workout-card">
        <div class="section-header">
          <h2>Today's Workout - {{ getDayName() }}</h2>
          <NuxtLink to="/health/plan" class="view-link">View Plan</NuxtLink>
        </div>

        <div v-if="dashboard?.todayWorkout" class="workout-content">
          <div class="workout-name">{{ dashboard.todayWorkout.name }}</div>
          <div class="workout-type">{{ dashboard.todayWorkout.type }}</div>
          <div class="workout-exercises">
            <div
              v-for="(exercise, idx) in dashboard.todayWorkout.exercises?.slice(0, 3)"
              :key="idx"
              class="exercise-item"
            >
              {{ exercise.name }} - {{ exercise.sets }}x{{ exercise.reps }}
            </div>
            <div v-if="dashboard.todayWorkout.exercises?.length > 3" class="more-exercises">
              +{{ dashboard.todayWorkout.exercises.length - 3 }} more exercises
            </div>
          </div>
          <div class="workout-duration">
            <Icon name="mdi:clock-outline" size="16" />
            {{ dashboard.todayWorkout.durationMinutes }} min
          </div>
        </div>

        <div v-else class="empty-state rest-day">
          <Icon name="mdi:bed" size="32" />
          <p>Rest Day</p>
          <span class="rest-hint">Take it easy today!</span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="actions-card">
        <NuxtLink to="/health/meals" class="action-btn">
          <Icon name="mdi:food" size="24" />
          <span>Log Meal</span>
        </NuxtLink>
        <NuxtLink to="/health/checkins" class="action-btn">
          <Icon name="mdi:scale" size="24" />
          <span>Check In</span>
        </NuxtLink>
        <NuxtLink to="/health/plan" class="action-btn">
          <Icon name="mdi:dumbbell" size="24" />
          <span>View Plans</span>
        </NuxtLink>
        <NuxtLink to="/health/setup" class="action-btn">
          <Icon name="mdi:cog" size="24" />
          <span>Settings</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.health-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.page-header p {
  color: var(--color-text-secondary);
}

.loading-state {
  padding: 40px;
}

.skeleton-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.skeleton-card {
  height: 100px;
  background: var(--color-bg-card);
  border-radius: 12px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.setup-prompt {
  display: flex;
  justify-content: center;
  padding: 60px 20px;
}

.setup-card {
  background: var(--color-bg-card);
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  max-width: 400px;
  border: 1px solid var(--color-border);
}

.setup-icon {
  color: var(--color-accent);
  margin-bottom: 16px;
}

.setup-card h2 {
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.setup-card p {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.btn {
  display: inline-block;
  padding: 12px 32px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.btn-primary:hover {
  background: var(--color-accent-dark);
}

.btn-sm {
  padding: 8px 16px;
  font-size: 0.875rem;
}

.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--color-bg-card);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--color-border);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.weight {
  background: var(--color-info-bg);
  color: var(--color-info);
}
.stat-icon.goal {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.stat-icon.change {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.stat-icon.change.negative {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.stat-icon.time {
  background: var(--color-purple);
  color: white;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-card {
  background: var(--color-bg-card);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--color-border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.view-link {
  color: var(--color-accent);
  text-decoration: none;
  font-size: 0.875rem;
}

.view-link:hover {
  text-decoration: underline;
}

.macros-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.macro-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.macro-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.macro-label {
  color: var(--color-text-secondary);
}

.macro-value {
  color: var(--color-text-primary);
  font-weight: 500;
}

.macro-bar {
  height: 8px;
  background: var(--color-bg-elevated);
  border-radius: 4px;
  overflow: hidden;
}

.macro-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.macro-fill.calories {
  background: var(--color-accent);
}
.macro-fill.protein {
  background: var(--color-info);
}
.macro-fill.carbs {
  background: var(--color-warning);
}
.macro-fill.fat {
  background: var(--color-purple);
}

.meals-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-bg-elevated);
  border-radius: 8px;
}

.meal-info {
  display: flex;
  flex-direction: column;
}

.meal-type {
  font-weight: 500;
  color: var(--color-text-primary);
  text-transform: capitalize;
}

.meal-calories {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.meal-macros {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.workout-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workout-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.workout-type {
  color: var(--color-accent);
  font-size: 0.875rem;
}

.workout-exercises {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exercise-item {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.more-exercises {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.workout-duration {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: var(--color-text-muted);
}

.empty-state.rest-day {
  background: var(--color-bg-elevated);
  border-radius: 8px;
}

.rest-hint {
  font-size: 0.875rem;
}

.actions-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  text-decoration: none;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  transform: translateY(-2px);
}

.action-btn span {
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .stats-row,
  .macros-grid,
  .actions-card {
    grid-template-columns: repeat(2, 1fr);
  }

  .skeleton-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
