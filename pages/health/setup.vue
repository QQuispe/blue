<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import BaseButton from '~/components/BaseButton.vue'

const { $toast } = useNuxtApp()
const router = useRouter()
const route = useRoute()

const usePlaceholderAsValue = (event: FocusEvent, defaultValue: number) => {
  const target = event.target as HTMLInputElement
  if (!target.value && target.placeholder) {
    const placeholderValue = parseInt(target.placeholder)
    if (!isNaN(placeholderValue)) {
      target.value = placeholderValue.toString()
      target.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

const adjustValue = (path: string, delta: number, min?: number, max?: number) => {
  const parts = path.split('.')
  let obj: any = profile.value
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]]
  }
  const key = parts[parts.length - 1]
  const current = obj[key] as number
  let newValue = (current || 0) + delta
  if (min !== undefined) newValue = Math.max(min, newValue)
  if (max !== undefined) newValue = Math.min(max, newValue)
  obj[key] = newValue
}

const currentStep = ref(0)
const totalSteps = 4
const isLoading = ref(false)
const hasChanges = ref(false)
const showExitModal = ref(false)

const initStep = () => {
  const stepParam = route.query.step as string
  if (stepParam === 'goals') {
    currentStep.value = 2
  } else if (stepParam === 'preferences') {
    currentStep.value = 3
  }
}

const handleExit = () => {
  if (hasChanges.value) {
    showExitModal.value = true
  } else {
    navigateTo('/health')
  }
}

const confirmExit = () => {
  showExitModal.value = false
  navigateTo('/health')
}

interface ProfileData {
  weight: number | null
  height: number | null
  age: number | null
  gender: string | null
  activityLevel: string
}

interface GoalData {
  goalType: string
  startingWeight: number | null
  targetWeight: number | null
  targetDate: string | null
  weeklyRate: number
}

interface PreferencesData {
  dietaryRestrictions: string[]
  allergies: string[]
  likedFoods: string[]
  dislikedFoods: string[]
  mealCount: number
  equipment: string[]
  workoutStyle: string | null
  workoutFrequency: number
  workoutDuration: number
}

const profile = ref<ProfileData>({
  weight: null,
  height: null,
  age: null,
  gender: null,
  activityLevel: 'moderate',
})

const goal = ref<GoalData>({
  goalType: 'lose',
  startingWeight: null,
  targetWeight: null,
  targetDate: null,
  weeklyRate: 0.5,
})

const preferences = ref<PreferencesData>({
  dietaryRestrictions: [],
  allergies: [],
  likedFoods: [],
  dislikedFoods: [],
  mealCount: 3,
  equipment: [],
  workoutStyle: 'strength',
  workoutFrequency: 4,
  workoutDuration: 45,
})

watch(
  [profile, goal, preferences],
  () => {
    hasChanges.value = true
  },
  { deep: true }
)

onMounted(() => {
  initStep()
})

const activityLevels = [
  { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
  { value: 'light', label: 'Light (1-3 days/week)' },
  { value: 'moderate', label: 'Moderate (3-5 days/week)' },
  { value: 'active', label: 'Active (6-7 days/week)' },
  { value: 'very_active', label: 'Very Active (intense daily)' },
]

const goalTypes = [
  { value: 'lose', label: 'Lose Weight' },
  { value: 'gain', label: 'Gain Weight' },
  { value: 'maintain', label: 'Maintain Weight' },
]

const workoutStyles = [
  { value: 'strength', label: 'Strength Training' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'hybrid', label: 'Hybrid (Mix)' },
  { value: 'flexibility', label: 'Flexibility/Yoga' },
]

const equipmentOptions = [
  { value: 'bodyweight', label: 'Bodyweight Only' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'machines', label: 'Gym Machines' },
  { value: 'kettlebell', label: 'Kettlebells' },
  { value: 'bands', label: 'Resistance Bands' },
]

const dietaryOptions = [
  { value: 'none', label: 'None' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'gluten-free', label: 'Gluten-Free' },
  { value: 'low-carb', label: 'Low-Carb' },
]

const step1Valid = computed(() => {
  return profile.value.weight && profile.value.height && profile.value.age && profile.value.gender
})

const step2Valid = computed(() => {
  return goal.value.startingWeight && goal.value.targetWeight
})

const step3Valid = computed(() => {
  return true
})

const canProceed = computed(() => {
  if (currentStep.value === 1) return step1Valid.value
  if (currentStep.value === 2) return step2Valid.value
  return true
})

const nextStep = () => {
  if (currentStep.value < totalSteps && canProceed.value) {
    // When going from Body Stats (step 1) to Goals (step 2), prefill starting weight
    if (currentStep.value === 1 && goal.value.startingWeight === null && profile.value.weight) {
      goal.value.startingWeight = profile.value.weight
    }
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const saveProfile = async () => {
  try {
    isLoading.value = true

    const response = await fetch('/api/health/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        weight: profile.value.weight,
        height: profile.value.height,
        age: profile.value.age,
        gender: profile.value.gender,
        activity_level: profile.value.activityLevel,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save profile')
    }

    return true
  } catch (err: any) {
    $toast.error('Failed to save profile')
    return false
  } finally {
    isLoading.value = false
  }
}

const saveGoal = async () => {
  try {
    isLoading.value = true

    const response = await fetch('/api/health/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        goal_type: goal.value.goalType,
        starting_weight: goal.value.startingWeight,
        target_weight: goal.value.targetWeight,
        target_date: goal.value.targetDate,
        weekly_rate: goal.value.weeklyRate,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save goal')
    }

    return true
  } catch (err: any) {
    $toast.error('Failed to save goal')
    return false
  } finally {
    isLoading.value = false
  }
}

const savePreferences = async () => {
  try {
    isLoading.value = true

    const response = await fetch('/api/health/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        dietary_restrictions: preferences.value.dietaryRestrictions,
        allergies: preferences.value.allergies,
        liked_foods: preferences.value.likedFoods,
        disliked_foods: preferences.value.dislikedFoods,
        meal_count: preferences.value.mealCount,
        equipment: preferences.value.equipment,
        workout_style: preferences.value.workoutStyle,
        workout_frequency: preferences.value.workoutFrequency,
        workout_duration: preferences.value.workoutDuration,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save preferences')
    }

    return true
  } catch (err: any) {
    $toast.error('Failed to save preferences')
    return false
  } finally {
    isLoading.value = false
  }
}

const completeSetup = async () => {
  const p = await saveProfile()
  if (!p) return

  const g = await saveGoal()
  if (!g) return

  const pr = await savePreferences()
  if (!pr) return

  $toast.success('Setup complete!')
  router.push('/health')
}
</script>

<template>
  <PageLayout title="Health Setup" subtitle="Let's get you started on your health journey">
    <div class="setup-container">
      <div class="setup-header-row">
        <div class="progress-bar">
          <div
            v-for="step in totalSteps"
            :key="step"
            class="progress-step"
            :class="{
              active: currentStep === step,
              completed: currentStep > step,
            }"
          >
            <div class="step-number">{{ step }}</div>
            <span class="step-label">
              {{
                step === 0
                  ? 'Intro'
                  : step === 1
                    ? 'Body Stats'
                    : step === 2
                      ? 'Goals'
                      : 'Preferences'
              }}
            </span>
          </div>
          <div class="progress-line">
            <div
              class="progress-fill"
              :style="{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }"
            ></div>
          </div>
        </div>

        <button class="exit-btn" @click="handleExit">
          {{ route.query.step ? 'Exit' : 'Exit Setup' }}
          <Icon name="mdi:close" size="18" />
        </button>
      </div>

      <div class="step-content">
        <!-- Step 0: Intro -->
        <div v-if="currentStep === 0" class="step-panel intro-panel">
          <div class="intro-content">
            <div class="intro-icon">
              <Icon name="mdi:heart-pulse" size="64" />
            </div>
            <h2>Welcome to Health Tracking</h2>
            <p>
              Let's set up your personalized health profile. This will help us create tailored meal
              and workout plans just for you.
            </p>

            <div class="intro-steps">
              <div class="intro-step-item">
                <div class="intro-step-number">1</div>
                <div class="intro-step-text">
                  <strong>Body Stats</strong>
                  <span>Tell us your weight, height, and activity level</span>
                </div>
              </div>
              <div class="intro-step-item">
                <div class="intro-step-number">2</div>
                <div class="intro-step-text">
                  <strong>Goals</strong>
                  <span>Define your weight goals and timeline</span>
                </div>
              </div>
              <div class="intro-step-item">
                <div class="intro-step-number">3</div>
                <div class="intro-step-text">
                  <strong>Preferences</strong>
                  <span>Customize your meal and workout preferences</span>
                </div>
              </div>
            </div>

            <BaseButton variant="primary" @click="currentStep = 1" class="start-btn">
              Get Started
              <Icon name="mdi:arrow-right" size="20" />
            </BaseButton>
          </div>
        </div>

        <!-- Step 1: Body Stats -->
        <div v-if="currentStep === 1" class="step-panel">
          <h2>Body Metrics</h2>
          <p class="step-description">Tell us about yourself</p>

          <div class="form-grid">
            <div class="form-group">
              <label>Current Weight (lbs)</label>
              <div class="number-input-wrapper">
                <input
                  v-model.number="profile.weight"
                  type="number"
                  placeholder="170"
                  min="50"
                  max="500"
                  @focus="e => usePlaceholderAsValue(e, 170)"
                />
                <div class="spinner-buttons">
                  <button type="button" @click="adjustValue('weight', 1, 50, 500)">
                    <Icon name="mdi:chevron-up" size="14" />
                  </button>
                  <div class="spinner-divider"></div>
                  <button type="button" @click="adjustValue('weight', -1, 50, 500)">
                    <Icon name="mdi:chevron-down" size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Height (inches)</label>
              <div class="number-input-wrapper">
                <input
                  v-model.number="profile.height"
                  type="number"
                  placeholder="70"
                  min="36"
                  max="108"
                  @focus="e => usePlaceholderAsValue(e, 70)"
                />
                <div class="spinner-buttons">
                  <button type="button" @click="adjustValue('height', 1, 36, 108)">
                    <Icon name="mdi:chevron-up" size="14" />
                  </button>
                  <div class="spinner-divider"></div>
                  <button type="button" @click="adjustValue('height', -1, 36, 108)">
                    <Icon name="mdi:chevron-down" size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Age</label>
              <div class="number-input-wrapper">
                <input
                  v-model.number="profile.age"
                  type="number"
                  placeholder="30"
                  min="13"
                  max="120"
                  @focus="e => usePlaceholderAsValue(e, 30)"
                />
                <div class="spinner-buttons">
                  <button type="button" @click="adjustValue('age', 1, 13, 120)">
                    <Icon name="mdi:chevron-up" size="14" />
                  </button>
                  <div class="spinner-divider"></div>
                  <button type="button" @click="adjustValue('age', -1, 13, 120)">
                    <Icon name="mdi:chevron-down" size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Gender</label>
              <select v-model="profile.gender">
                <option :value="null" disabled>Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="form-group full-width">
              <label>Activity Level</label>
              <select v-model="profile.activityLevel">
                <option v-for="level in activityLevels" :key="level.value" :value="level.value">
                  {{ level.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 2: Goals -->
        <div v-if="currentStep === 2" class="step-panel">
          <h2>Your Goals</h2>
          <p class="step-description">What do you want to achieve?</p>

          <div class="form-grid">
            <div class="form-group full-width">
              <label>Goal Type</label>
              <div class="goal-options">
                <button
                  v-for="type in goalTypes"
                  :key="type.value"
                  class="goal-option"
                  :class="{ active: goal.goalType === type.value }"
                  @click="goal.goalType = type.value"
                >
                  {{ type.label }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Starting Weight (lbs)</label>
              <div class="number-input-wrapper">
                <input
                  v-model.number="goal.startingWeight"
                  type="number"
                  placeholder="170"
                  min="50"
                  max="500"
                  @focus="e => usePlaceholderAsValue(e, 170)"
                />
                <div class="spinner-buttons">
                  <button
                    type="button"
                    @click="goal.startingWeight = Math.min(500, (goal.startingWeight || 0) + 1)"
                  >
                    <Icon name="mdi:chevron-up" size="14" />
                  </button>
                  <div class="spinner-divider"></div>
                  <button
                    type="button"
                    @click="goal.startingWeight = Math.max(50, (goal.startingWeight || 0) - 1)"
                  >
                    <Icon name="mdi:chevron-down" size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Target Weight (lbs)</label>
              <div class="number-input-wrapper">
                <input
                  v-model.number="goal.targetWeight"
                  type="number"
                  placeholder="160"
                  min="50"
                  max="500"
                  @focus="e => usePlaceholderAsValue(e, 160)"
                />
                <div class="spinner-buttons">
                  <button
                    type="button"
                    @click="goal.targetWeight = Math.min(500, (goal.targetWeight || 0) + 1)"
                  >
                    <Icon name="mdi:chevron-up" size="14" />
                  </button>
                  <div class="spinner-divider"></div>
                  <button
                    type="button"
                    @click="goal.targetWeight = Math.max(50, (goal.targetWeight || 0) - 1)"
                  >
                    <Icon name="mdi:chevron-down" size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Target Date (optional)</label>
              <input v-model="goal.targetDate" type="date" />
            </div>

            <div class="form-group">
              <label>Weekly Rate (lbs/week)</label>
              <div class="number-input-wrapper">
                <input
                  v-model.number="goal.weeklyRate"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="3"
                />
                <div class="spinner-buttons">
                  <button
                    type="button"
                    @click="
                      goal.weeklyRate = Math.min(
                        3,
                        Math.round((goal.weeklyRate || 0 + 0.1) * 10) / 10
                      )
                    "
                  >
                    <Icon name="mdi:chevron-up" size="14" />
                  </button>
                  <div class="spinner-divider"></div>
                  <button
                    type="button"
                    @click="
                      goal.weeklyRate = Math.max(
                        0.1,
                        Math.round((goal.weeklyRate || 0 - 0.1) * 10) / 10
                      )
                    "
                  >
                    <Icon name="mdi:chevron-down" size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Preferences -->
        <div v-if="currentStep === 3" class="step-panel">
          <h2>Preferences</h2>
          <p class="step-description">Customize your meal and workout plans</p>

          <div class="form-grid">
            <div class="form-group full-width">
              <label>Dietary Restrictions</label>
              <div class="checkbox-group">
                <label v-for="diet in dietaryOptions" :key="diet.value" class="checkbox-label">
                  <input
                    type="checkbox"
                    :value="diet.value"
                    v-model="preferences.dietaryRestrictions"
                  />
                  {{ diet.label }}
                </label>
              </div>
            </div>

            <div class="form-group full-width">
              <label>Available Equipment</label>
              <div class="checkbox-group">
                <label v-for="equip in equipmentOptions" :key="equip.value" class="checkbox-label">
                  <input type="checkbox" :value="equip.value" v-model="preferences.equipment" />
                  {{ equip.label }}
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>Workout Style</label>
              <select v-model="preferences.workoutStyle">
                <option v-for="style in workoutStyles" :key="style.value" :value="style.value">
                  {{ style.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Workouts per Week</label>
              <div class="number-input-wrapper">
                <input
                  v-model.number="preferences.workoutFrequency"
                  type="number"
                  min="1"
                  max="7"
                />
                <div class="spinner-buttons">
                  <button
                    type="button"
                    @click="
                      preferences.workoutFrequency = Math.min(
                        7,
                        (preferences.workoutFrequency || 0) + 1
                      )
                    "
                  >
                    <Icon name="mdi:chevron-up" size="14" />
                  </button>
                  <div class="spinner-divider"></div>
                  <button
                    type="button"
                    @click="
                      preferences.workoutFrequency = Math.max(
                        1,
                        (preferences.workoutFrequency || 0) - 1
                      )
                    "
                  >
                    <Icon name="mdi:chevron-down" size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Meals per Day</label>
              <div class="number-input-wrapper">
                <input v-model.number="preferences.mealCount" type="number" min="2" max="6" />
                <div class="spinner-buttons">
                  <button
                    type="button"
                    @click="preferences.mealCount = Math.min(6, (preferences.mealCount || 0) + 1)"
                  >
                    <Icon name="mdi:chevron-up" size="14" />
                  </button>
                  <div class="spinner-divider"></div>
                  <button
                    type="button"
                    @click="preferences.mealCount = Math.max(2, (preferences.mealCount || 0) - 1)"
                  >
                    <Icon name="mdi:chevron-down" size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Workout Duration (min)</label>
              <div class="number-input-wrapper">
                <input
                  v-model.number="preferences.workoutDuration"
                  type="number"
                  min="15"
                  max="120"
                  step="5"
                />
                <div class="spinner-buttons">
                  <button
                    type="button"
                    @click="
                      preferences.workoutDuration = Math.min(
                        120,
                        (preferences.workoutDuration || 0) + 5
                      )
                    "
                  >
                    <Icon name="mdi:chevron-up" size="14" />
                  </button>
                  <div class="spinner-divider"></div>
                  <button
                    type="button"
                    @click="
                      preferences.workoutDuration = Math.max(
                        15,
                        (preferences.workoutDuration || 0) - 5
                      )
                    "
                  >
                    <Icon name="mdi:chevron-down" size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group full-width">
              <label>Liked Foods (comma-separated)</label>
              <input
                v-model="preferences.likedFoods"
                type="text"
                placeholder="chicken, rice, broccoli"
                @change="
                  preferences.likedFoods = ($event.target as HTMLInputElement).value
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                "
              />
            </div>

            <div class="form-group full-width">
              <label>Disliked Foods (comma-separated)</label>
              <input
                v-model="preferences.dislikedFoods"
                type="text"
                placeholder="fish, mushrooms"
                @change="
                  preferences.dislikedFoods = ($event.target as HTMLInputElement).value
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                "
              />
            </div>
          </div>
        </div>
      </div>

      <div class="step-actions">
        <button
          v-if="currentStep > 1"
          class="btn btn-secondary"
          @click="prevStep"
          :disabled="isLoading"
        >
          Back
        </button>

        <button
          v-if="currentStep > 0 && currentStep < 3"
          class="btn btn-primary"
          @click="nextStep"
          :disabled="!canProceed"
        >
          {{ currentStep === 2 ? 'Continue to Preferences' : 'Continue' }}
        </button>

        <button
          v-if="currentStep === 3"
          class="btn btn-primary"
          @click="completeSetup"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Saving...' : 'Complete Setup' }}
        </button>
      </div>
    </div>

    <!-- Exit Confirmation Modal -->
    <div v-if="showExitModal" class="modal-overlay" @click="showExitModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Unsaved Changes</h3>
          <button class="close-btn" @click="showExitModal = false">×</button>
        </div>
        <div class="modal-body">
          <p>You have unsaved changes. Are you sure you want to leave?</p>
        </div>
        <div class="modal-footer">
          <BaseButton variant="secondary" @click="showExitModal = false">Stay</BaseButton>
          <BaseButton variant="danger" @click="confirmExit">Leave Anyway</BaseButton>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.setup-container {
  width: 100%;
  max-width: 700px;
  background: var(--color-bg-card);
  border-radius: 16px;
  padding: 40px;
  border: 1px solid var(--color-border);
  margin: 0 auto;
}

.setup-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.progress-bar {
  flex: 1;
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-bottom: 40px;
  padding: 0 20px;
}

.progress-line {
  position: absolute;
  top: 16px;
  left: 60px;
  right: 60px;
  height: 2px;
  background: var(--color-border);
  z-index: 0;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-bg-elevated);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.progress-step.active .step-number {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg-primary);
}

.progress-step.completed .step-number {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg-primary);
}

.step-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.progress-step.active .step-label {
  color: var(--color-text-primary);
}

.step-content {
  margin-bottom: 32px;
}

.intro-panel {
  text-align: center;
  padding: 20px 0;
}

.intro-content {
  max-width: 500px;
  margin: 0 auto;
}

.intro-icon {
  color: var(--color-accent);
  margin-bottom: 16px;
}

.intro-content h2 {
  font-size: 1.75rem;
  margin-bottom: 12px;
}

.intro-content p {
  color: var(--color-text-secondary);
  margin-bottom: 32px;
}

.intro-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
  text-align: left;
}

.intro-step-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.intro-step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.intro-step-text {
  display: flex;
  flex-direction: column;
}

.intro-step-text strong {
  color: var(--color-text-primary);
}

.intro-step-text span {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.step-panel h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.step-description {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group select {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.goal-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.goal-option {
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.goal-option:hover {
  border-color: var(--color-accent);
}

.goal-option.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg-primary);
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.checkbox-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent);
}

.checkbox-label:has(input:checked) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.step-actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.btn {
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-dark);
}

.btn-secondary {
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.exit-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.exit-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border-hover);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-card);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  color: var(--color-text-secondary);
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

.number-input-wrapper {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--color-bg-secondary);
  transition: border-color 0.15s;
}

.number-input-wrapper:focus-within {
  border-color: var(--color-accent);
}

.number-input-wrapper input[type='number'] {
  flex: 1;
  padding-right: 12px;
  padding-left: 12px;
  border: none;
  text-align: right;
  font-variant-numeric: tabular-nums;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: textfield;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  outline: none;
}

.number-input-wrapper input[type='number']::-webkit-inner-spin-button,
.number-input-wrapper input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-input-wrapper input[type='number'] {
  -moz-appearance: textfield;
}

.spinner-buttons {
  display: flex;
  flex-direction: column;
  width: 28px;
  overflow: hidden;
  flex-shrink: 0;
}

.spinner-buttons button {
  flex: 1;
  background: var(--color-bg-card);
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}

.spinner-buttons button:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

.spinner-buttons button:active {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.spinner-buttons button svg {
  width: 12px;
  height: 12px;
}

.spinner-divider {
  height: 1px;
  background: var(--color-border);
}
</style>
