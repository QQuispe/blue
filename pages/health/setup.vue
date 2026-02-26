<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHealthSetup } from '~/composables/health/useHealthSetup'
import PageLayout from '~/components/PageLayout.vue'
import BaseButton from '~/components/BaseButton.vue'

const route = useRoute()

const {
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
} = useHealthSetup()

const steps = ['Introduction', 'Body Stats', 'Goals', 'Preferences']

const activityLevels = [
  { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
  { value: 'light', label: 'Light (exercise 1-3 days/week)' },
  { value: 'moderate', label: 'Moderate (exercise 3-5 days/week)' },
  { value: 'active', label: 'Active (exercise 6-7 days/week)' },
  { value: 'very_active', label: 'Very Active (hard exercise daily)' },
]

const goalTypes = [
  { value: 'lose', label: 'Lose Weight' },
  { value: 'maintain', label: 'Maintain Weight' },
  { value: 'gain', label: 'Gain Weight' },
]

const workoutDays = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const handleNext = async () => {
  if (currentStep.value === 1) {
    const success = await saveProfile()
    if (!success) return
  } else if (currentStep.value === 2) {
    const success = await saveGoal()
    if (!success) return
  } else if (currentStep.value === 3) {
    const success = await savePreferences()
    if (!success) return
  }

  if (currentStep.value === totalSteps - 1) {
    await completeSetup()
  } else {
    nextStep()
  }
}

onMounted(async () => {
  const stepParam = route.query.step as string
  if (stepParam === 'goals') {
    currentStep.value = 2
  } else if (stepParam === 'preferences') {
    currentStep.value = 3
  }
  await fetchExistingData()
})
</script>

<template>
  <PageLayout title="Health Setup">
    <div class="setup-container">
      <!-- Progress Steps -->
      <div class="progress-steps">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="step"
          :class="{ active: currentStep === index, completed: currentStep > index }"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-label">{{ step }}</div>
        </div>
      </div>

      <!-- Step 0: Introduction -->
      <div v-if="currentStep === 0" class="step-content">
        <div class="intro-card">
          <div class="intro-icon">
            <Icon name="mdi:heart-pulse" size="64" />
          </div>
          <h2>Welcome to Health Tracking</h2>
          <p>
            Let's set up your profile to get personalized recommendations for your nutrition and
            fitness goals.
          </p>
          <p>This will take just a few minutes.</p>
          <BaseButton variant="primary" size="lg" @click="nextStep"> Get Started </BaseButton>
        </div>
      </div>

      <!-- Step 1: Body Stats -->
      <div v-if="currentStep === 1" class="step-content">
        <h2>Body Stats</h2>
        <p class="step-description">Tell us a bit about yourself.</p>

        <div class="form-grid">
          <div class="form-group">
            <label>Current Weight (lbs)</label>
            <input v-model.number="profile.weight" type="number" placeholder="150" />
          </div>

          <div class="form-group">
            <label>Height (cm)</label>
            <input v-model.number="profile.height" type="number" placeholder="170" />
          </div>

          <div class="form-group">
            <label>Age</label>
            <input v-model.number="profile.age" type="number" placeholder="30" />
          </div>

          <div class="form-group">
            <label>Gender</label>
            <select v-model="profile.gender">
              <option value="">Select...</option>
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
      <div v-if="currentStep === 2" class="step-content">
        <h2>Your Goals</h2>
        <p class="step-description">What do you want to achieve?</p>

        <div class="form-grid">
          <div class="form-group full-width">
            <label>Goal Type</label>
            <div class="goal-options">
              <label
                v-for="type in goalTypes"
                :key="type.value"
                class="goal-option"
                :class="{ selected: goal.goalType === type.value }"
              >
                <input v-model="goal.goalType" type="radio" :value="type.value" />
                {{ type.label }}
              </label>
            </div>
          </div>

          <div v-if="goal.goalType !== 'maintain'" class="form-group">
            <label>Starting Weight (lbs)</label>
            <input
              v-model.number="goal.startingWeight"
              type="number"
              :placeholder="String(profile.weight || '')"
            />
          </div>

          <div v-if="goal.goalType !== 'maintain'" class="form-group">
            <label>Target Weight (lbs)</label>
            <input v-model.number="goal.targetWeight" type="number" placeholder="150" />
          </div>

          <div v-if="goal.goalType !== 'maintain'" class="form-group">
            <label>Target Date</label>
            <input v-model="goal.targetDate" type="date" />
          </div>
        </div>
      </div>

      <!-- Step 3: Preferences -->
      <div v-if="currentStep === 3" class="step-content">
        <h2>Preferences</h2>
        <p class="step-description">Customize your experience.</p>

        <div class="form-grid">
          <div class="form-group">
            <label>Meals per Day</label>
            <input v-model.number="preferences.mealsPerDay" type="number" min="1" max="6" />
          </div>

          <div class="form-group">
            <label>Workout Duration (minutes)</label>
            <input v-model.number="preferences.workoutDuration" type="number" min="15" max="120" />
          </div>

          <div class="form-group full-width">
            <label>Preferred Workout Days</label>
            <div class="day-options">
              <label
                v-for="day in workoutDays"
                :key="day.value"
                class="day-option"
                :class="{ selected: preferences.workoutDays.includes(day.value) }"
              >
                <input
                  type="checkbox"
                  :checked="preferences.workoutDays.includes(day.value)"
                  @change="
                    preferences.workoutDays.includes(day.value)
                      ? preferences.workoutDays.splice(
                          preferences.workoutDays.indexOf(day.value),
                          1
                        )
                      : preferences.workoutDays.push(day.value)
                  "
                />
                {{ day.label }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div v-if="currentStep > 0" class="step-navigation">
        <BaseButton v-if="currentStep > 0" variant="secondary" @click="prevStep"> Back </BaseButton>
        <BaseButton variant="primary" :loading="isLoading" @click="handleNext">
          {{ currentStep === totalSteps - 1 ? 'Complete Setup' : 'Continue' }}
        </BaseButton>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.setup-container {
  max-width: 700px;
  margin: 0 auto;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-elevated);
  color: var(--color-text-muted);
  font-weight: 600;
  border: 2px solid var(--color-border);
}

.step.active .step-number,
.step.completed .step-number {
  background: var(--color-accent);
  color: var(--color-bg-primary);
  border-color: var(--color-accent);
}

.step-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.step.active .step-label {
  color: var(--color-accent);
  font-weight: 500;
}

.step-content {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 32px;
}

.step-content h2 {
  font-size: 1.5rem;
  margin: 0 0 8px;
}

.step-description {
  color: var(--color-text-muted);
  margin: 0 0 24px;
}

.intro-card {
  text-align: center;
  padding: 40px 20px;
}

.intro-icon {
  color: var(--color-accent);
  margin-bottom: 24px;
}

.intro-card h2 {
  margin: 0 0 16px;
}

.intro-card p {
  color: var(--color-text-secondary);
  margin: 0 0 12px;
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
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.goal-options {
  display: flex;
  gap: 12px;
}

.goal-option {
  flex: 1;
  padding: 16px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}

.goal-option input {
  display: none;
}

.goal-option.selected {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.day-options {
  display: flex;
  gap: 8px;
}

.day-option {
  flex: 1;
  padding: 12px 8px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  font-size: 0.875rem;
}

.day-option input {
  display: none;
}

.day-option.selected {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.step-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}
</style>
