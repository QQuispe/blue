<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import Card from '~/components/Card.vue'
import MacroCard from '~/components/health/MacroCard.vue'
import QuickStats from '~/components/health/QuickStats.vue'

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
const userTimezone = ref('America/New_York')

const fetchUserSettings = async () => {
  try {
    const res = await fetch('/api/user/settings', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      userTimezone.value = data.settings?.timezone || 'America/New_York'
    }
  } catch (err) {
    console.error('Failed to fetch settings:', err)
  }
}

onMounted(async () => {
  await fetchUserSettings()
  fetchDashboard()
})

const getLocalDateString = () => {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone.value,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const fetchDashboard = async () => {
  try {
    isLoading.value = true
    const localDate = getLocalDateString()
    const response = await fetch(`/api/health/dashboard?date=${localDate}`, {
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

const getDayName = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
}

const formatNumber = (num: any, decimals = 0) => {
  if (num === null || num === undefined || typeof num !== 'number') return '0'
  return num.toFixed(decimals)
}

const goalText = computed(() => {
  if (!dashboard.value?.activeGoal) return ''
  const g = dashboard.value.activeGoal
  const type = g.goalType === 'lose' ? 'Lose' : g.goalType === 'gain' ? 'Gain' : 'Maintain'
  return `${type} ${g.targetWeight} lbs`
})

const quickStats = computed(() => {
  if (!dashboard.value) return []

  const weightChange = dashboard.value.progress?.weightChange
  const changeStr =
    weightChange !== null && weightChange !== undefined
      ? (weightChange > 0 ? '+' : '') + formatNumber(weightChange, 1)
      : '--'

  return [
    {
      label: 'Current',
      value: `${dashboard.value.profile?.weight || '--'} lbs`,
      icon: 'mdi:scale-bathroom',
      color: 'info',
    },
    {
      label: 'Target',
      value: `${dashboard.value.activeGoal?.targetWeight || '--'} lbs`,
      icon: 'mdi:flag',
      color: 'success',
    },
    {
      label: 'Change',
      value: `${changeStr} lbs`,
      icon: weightChange < 0 ? 'mdi:trending-down' : 'mdi:trending-up',
      color: weightChange < 0 ? 'success' : 'warning',
    },
    {
      label: 'Weeks Left',
      value: dashboard.value.progress?.weeksRemaining ?? '--',
      icon: 'mdi:calendar-clock',
      color: 'accent',
    },
  ]
})

onMounted(() => {
  fetchDashboard()
})
</script>

<template>
  <PageLayout title="Health" :subtitle="goalText">
    <!-- Loading State -->
    <div v-if="isLoading" class="skeleton-grid">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>

    <!-- Needs Setup -->
    <Card v-else-if="needsSetup" class="setup-card">
      <div class="setup-content">
        <div class="setup-icon">
          <Icon name="mdi:heart-pulse" size="48" />
        </div>
        <h2>Welcome to Health Tracking</h2>
        <p>Set up your profile and goals to get started</p>
        <NuxtLink to="/health/setup" class="btn btn-primary">Start Setup</NuxtLink>
      </div>
    </Card>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-grid">
      <!-- Quick Stats with edit buttons -->
      <div class="stats-section">
        <div class="section-header">
          <h2>Progress</h2>
          <div class="edit-buttons">
            <NuxtLink to="/health/checkins" class="edit-link">
              <Icon name="mdi:scale" size="16" />
              Log Weight
            </NuxtLink>
            <NuxtLink to="/health/setup?step=goals&from=dashboard" class="edit-link">
              <Icon name="mdi:pencil" size="16" />
              Edit Goal
            </NuxtLink>
          </div>
        </div>
        <QuickStats :stats="quickStats" />
      </div>

      <!-- Macros -->
      <Card>
        <div class="section-header">
          <h2>Today's Macros</h2>
          <NuxtLink to="/health/meals" class="view-link">Log Meals</NuxtLink>
        </div>
        <div class="macros-grid">
          <MacroCard
            label="Calories"
            :current="dashboard?.todayMacros?.calories || 0"
            :target="dashboard?.targetMacros?.calories || 2000"
            unit=""
            color="accent"
          />
          <MacroCard
            label="Protein"
            :current="dashboard?.todayMacros?.protein || 0"
            :target="dashboard?.targetMacros?.protein || 120"
            color="info"
          />
          <MacroCard
            label="Carbs"
            :current="dashboard?.todayMacros?.carbs || 0"
            :target="dashboard?.targetMacros?.carbs || 200"
            color="warning"
          />
          <MacroCard
            label="Fat"
            :current="dashboard?.todayMacros?.fat || 0"
            :target="dashboard?.targetMacros?.fat || 65"
            color="error"
          />
        </div>
      </Card>

      <!-- Today's Meals -->
      <Card>
        <div class="section-header">
          <h2>Today's Meals</h2>
          <NuxtLink to="/health/meals" class="view-link">View All</NuxtLink>
        </div>

        <div v-if="dashboard?.todayMeals?.length" class="items-list">
          <div v-for="meal in dashboard.todayMeals" :key="meal.id" class="item-row">
            <div class="item-info">
              <span class="item-label">{{ meal.mealType }}</span>
              <span class="item-value">{{ formatNumber(meal.totalCalories) }} cal</span>
            </div>
            <div class="item-meta">
              <span>Protein: {{ formatNumber(meal.totalProtein) }}g</span>
              <span>Carbs: {{ formatNumber(meal.totalCarbs) }}g</span>
              <span>Fat: {{ formatNumber(meal.totalFat) }}g</span>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <Icon name="mdi:food-off" size="32" />
          <p>No meals logged today</p>
          <NuxtLink to="/health/meals" class="btn btn-sm">Log Meal</NuxtLink>
        </div>
      </Card>

      <!-- Today's Workout -->
      <Card>
        <div class="section-header">
          <h2>Today's Workout - {{ getDayName() }}</h2>
          <NuxtLink to="/health/plan" class="view-link">View Plan</NuxtLink>
        </div>

        <div v-if="dashboard?.todayWorkout" class="workout-content">
          <div class="workout-title">{{ dashboard.todayWorkout.name }}</div>
          <div class="workout-type">{{ dashboard.todayWorkout.type }}</div>
          <div class="exercises-list">
            <div
              v-for="(ex, idx) in dashboard.todayWorkout.exercises?.slice(0, 3)"
              :key="idx"
              class="exercise-item"
            >
              {{ ex.name }} - {{ ex.sets }}x{{ ex.reps }}
            </div>
            <div v-if="dashboard.todayWorkout.exercises?.length > 3" class="more">
              +{{ dashboard.todayWorkout.exercises.length - 3 }} more
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
          <span>Take it easy today!</span>
        </div>
      </Card>

      <!-- Quick Actions -->
      <div class="actions-grid">
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
        <NuxtLink to="/settings" class="action-btn">
          <Icon name="mdi:cog" size="24" />
          <span>Settings</span>
        </NuxtLink>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.skeleton {
  height: 100px;
  background: var(--color-bg-card);
  border-radius: 10px;
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

.setup-card {
  max-width: 400px;
  margin: 40px auto;
}

.setup-content {
  text-align: center;
  padding: 20px;
}

.setup-icon {
  color: var(--color-accent);
  margin-bottom: 16px;
}

.setup-content h2 {
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.setup-content p {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
}

.section-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.edit-buttons {
  display: flex;
  gap: 12px;
}

.edit-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.edit-link:hover {
  color: var(--color-accent);
  background: var(--color-bg-hover);
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

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-bg-elevated);
  border-radius: 8px;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-label {
  font-weight: 500;
  color: var(--color-text-primary);
  text-transform: capitalize;
}

.item-value {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.item-meta {
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

.workout-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.workout-type {
  color: var(--color-accent);
  font-size: 0.875rem;
}

.exercises-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exercise-item {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.more {
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

.actions-grid {
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
  border-radius: 10px;
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

@media (max-width: 768px) {
  .skeleton-grid,
  .macros-grid,
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
