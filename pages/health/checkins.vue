<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import Card from '~/components/Card.vue'
import BaseButton from '~/components/BaseButton.vue'

const { $toast } = useNuxtApp()

interface Checkin {
  id: number
  checkinDate: string
  weight: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  biceps: number | null
  thighs: number | null
  notes: string | null
  createdAt: string
}

const isLoading = ref(true)
const isSubmitting = ref(false)
const checkins = ref<Checkin[]>([])

const showCheckinModal = ref(false)
const checkinForm = ref({
  weight: null as number | null,
  chest: null as number | null,
  waist: null as number | null,
  hips: null as number | null,
  biceps: null as number | null,
  thighs: null as number | null,
  notes: '',
})

const fetchCheckins = async () => {
  try {
    isLoading.value = true
    const response = await fetch('/api/health/checkins', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch check-ins')
    }

    const data = await response.json()
    checkins.value = data.checkins
  } catch (err: any) {
    console.error('Error:', err)
  } finally {
    isLoading.value = false
  }
}

const submitCheckin = async () => {
  if (!checkinForm.value.weight) {
    $toast.error('Weight is required')
    return
  }

  try {
    isSubmitting.value = true

    const response = await fetch('/api/health/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        weight: checkinForm.value.weight,
        chest: checkinForm.value.chest,
        waist: checkinForm.value.waist,
        hips: checkinForm.value.hips,
        biceps: checkinForm.value.biceps,
        thighs: checkinForm.value.thighs,
        notes: checkinForm.value.notes || null,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save check-in')
    }

    $toast.success('Check-in saved!')
    showCheckinModal.value = false
    resetForm()
    fetchCheckins()
  } catch (err: any) {
    $toast.error('Failed to save check-in')
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  checkinForm.value = {
    weight: null,
    chest: null,
    waist: null,
    hips: null,
    biceps: null,
    thighs: null,
    notes: '',
  }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const calculateWeightChange = (current: number, previous: number) => {
  const change = current - previous
  return (change > 0 ? '+' : '') + change.toFixed(1)
}

onMounted(() => {
  fetchCheckins()
})
</script>

<template>
  <PageLayout title="Progress Check-ins">
    <div class="page-actions">
      <BaseButton variant="primary" @click="showCheckinModal = true">
        <Icon name="mdi:plus" size="20" />
        New Check-in
      </BaseButton>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <div v-else class="checkins-content">
      <div v-if="checkins.length === 0" class="empty-state">
        <Icon name="mdi:scale" size="48" />
        <p>No check-ins yet</p>
        <span>Start tracking your progress today</span>
        <BaseButton variant="primary" @click="showCheckinModal = true"
          >Add First Check-in</BaseButton
        >
      </div>

      <div v-else class="checkins-list">
        <Card v-for="(checkin, index) in checkins" :key="checkin.id" class="checkin-card">
          <div class="checkin-header">
            <span class="checkin-date">{{ formatDate(checkin.checkinDate) }}</span>
            <span
              v-if="index < checkins.length - 1"
              class="weight-change"
              :class="{ negative: Number(checkins[index + 1]?.weight) > checkin.weight }"
            >
              {{
                calculateWeightChange(checkins[index + 1]?.weight || checkin.weight, checkin.weight)
              }}
              lbs
            </span>
          </div>

          <div class="checkin-measurements">
            <div class="measurement main">
              <span class="measurement-value">{{ checkin.weight }}</span>
              <span class="measurement-label">Weight (lbs)</span>
            </div>

            <div v-if="checkin.waist" class="measurement">
              <span class="measurement-value">{{ checkin.waist }}</span>
              <span class="measurement-label">Waist</span>
            </div>

            <div v-if="checkin.chest" class="measurement">
              <span class="measurement-value">{{ checkin.chest }}</span>
              <span class="measurement-label">Chest</span>
            </div>

            <div v-if="checkin.hips" class="measurement">
              <span class="measurement-value">{{ checkin.hips }}</span>
              <span class="measurement-label">Hips</span>
            </div>

            <div v-if="checkin.biceps" class="measurement">
              <span class="measurement-value">{{ checkin.biceps }}</span>
              <span class="measurement-label">Biceps</span>
            </div>

            <div v-if="checkin.thighs" class="measurement">
              <span class="measurement-value">{{ checkin.thighs }}</span>
              <span class="measurement-label">Thighs</span>
            </div>
          </div>

          <div v-if="checkin.notes" class="checkin-notes">
            <Icon name="mdi:note-text-outline" size="16" />
            {{ checkin.notes }}
          </div>
        </Card>
      </div>
    </div>

    <!-- Check-in Modal -->
    <div v-if="showCheckinModal" class="modal-overlay" @click.self="showCheckinModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>New Check-in</h2>
          <button class="close-btn" @click="showCheckinModal = false">
            <Icon name="mdi:close" size="24" />
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Weight (lbs) *</label>
            <input v-model.number="checkinForm.weight" type="number" step="0.1" placeholder="170" />
          </div>

          <div class="measurements-grid">
            <div class="form-group">
              <label>Waist (in)</label>
              <input v-model.number="checkinForm.waist" type="number" step="0.1" placeholder="32" />
            </div>

            <div class="form-group">
              <label>Chest (in)</label>
              <input v-model.number="checkinForm.chest" type="number" step="0.1" placeholder="40" />
            </div>

            <div class="form-group">
              <label>Hips (in)</label>
              <input v-model.number="checkinForm.hips" type="number" step="0.1" placeholder="38" />
            </div>

            <div class="form-group">
              <label>Biceps (in)</label>
              <input
                v-model.number="checkinForm.biceps"
                type="number"
                step="0.1"
                placeholder="14"
              />
            </div>

            <div class="form-group">
              <label>Thighs (in)</label>
              <input
                v-model.number="checkinForm.thighs"
                type="number"
                step="0.1"
                placeholder="22"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea
              v-model="checkinForm.notes"
              placeholder="How do you feel? Any observations..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <BaseButton variant="secondary" @click="showCheckinModal = false">Cancel</BaseButton>
          <BaseButton
            variant="primary"
            @click="submitCheckin"
            :disabled="isSubmitting || !checkinForm.weight"
          >
            {{ isSubmitting ? 'Saving...' : 'Save Check-in' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.page-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px;
  color: var(--color-text-muted);
}

.empty-state span {
  font-size: 0.875rem;
}

.checkins-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.checkin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.checkin-date {
  font-weight: 600;
  color: var(--color-text-primary);
}

.weight-change {
  font-size: 0.875rem;
  color: var(--color-error);
}

.weight-change.negative {
  color: var(--color-success);
}

.checkin-measurements {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.measurement {
  display: flex;
  flex-direction: column;
}

.measurement.main .measurement-value {
  font-size: 2rem;
}

.measurement-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.measurement-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.checkin-notes {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
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
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 1.25rem;
  color: var(--color-text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 1rem;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
}

.measurements-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--color-border);
}
</style>
