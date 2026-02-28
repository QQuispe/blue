<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '~/components/PageLayout.vue'
import HealthSetupRequired from '~/components/health/HealthSetupRequired.vue'
import { useCheckins } from '~/composables/health/useCheckins'
import { useHealthData } from '~/composables/useHealthData'
import DeleteConfirmModal from '~/components/health/DeleteConfirmModal.vue'
import BaseButton from '~/components/BaseButton.vue'

const { $toast } = useNuxtApp()

// Use centralized health data
const { setupStatus, isReady } = useHealthData()
const needsSetup = computed(() => {
  if (!isReady.value) return false
  return !setupStatus.value?.isComplete
})

// Composables
const {
  checkins,
  isLoading,
  isSubmitting,
  showCheckinModal,
  isEditingCheckin,
  checkinForm,
  checkinToDelete,
  showDeleteConfirmModal,
  openNewCheckinModal,
  openEditCheckinModal,
  closeCheckinModal,
  confirmDeleteCheckin,
  cancelDeleteCheckin,
  fetchCheckins,
  submitCheckin,
  deleteCheckin,
} = useCheckins()

// Computed
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatNumber = (num: any) => {
  if (num === null || num === undefined || typeof num !== 'number') return '--'
  return num.toFixed(1)
}

// Initialize
onMounted(async () => {
  // Wait for plugin initialization
  await new Promise(resolve => setTimeout(resolve, 0))
  if (isReady.value && !needsSetup.value) {
    await fetchCheckins()
  }
})
</script>

<template>
  <PageLayout title="Check-ins" subtitle="Track your progress over time">
    <!-- Loading - show while waiting for plugin init or page loading -->
    <div v-if="!isReady || isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <!-- Setup Required -->
    <HealthSetupRequired v-else-if="needsSetup" />

    <!-- Main Content -->
    <div v-else class="checkins-page">
      <!-- Header -->
      <div class="page-header">
        <BaseButton variant="primary" @click="openNewCheckinModal">
          <Icon name="mdi:plus" size="18" />
          Log Check-in
        </BaseButton>
      </div>

      <!-- Check-ins List -->
      <div class="checkins-list">
        <div v-for="checkin in checkins" :key="checkin.id" class="checkin-card">
          <div class="checkin-header">
            <span class="checkin-date">{{ formatDate(checkin.checkin_date) }}</span>
            <div class="checkin-actions">
              <button class="action-btn" @click="openEditCheckinModal(checkin)">
                <Icon name="mdi:pencil-outline" size="18" />
              </button>
              <button class="action-btn delete" @click="confirmDeleteCheckin(checkin)">
                <Icon name="mdi:delete-outline" size="18" />
              </button>
            </div>
          </div>

          <div class="checkin-stats">
            <div class="stat">
              <span class="stat-label">Weight</span>
              <span class="stat-value">{{ formatNumber(checkin.weight) }} lbs</span>
            </div>
            <div v-if="checkin.waist" class="stat">
              <span class="stat-label">Waist</span>
              <span class="stat-value">{{ formatNumber(checkin.waist) }} in</span>
            </div>
            <div v-if="checkin.chest" class="stat">
              <span class="stat-label">Chest</span>
              <span class="stat-value">{{ formatNumber(checkin.chest) }} in</span>
            </div>
            <div v-if="checkin.hips" class="stat">
              <span class="stat-label">Hips</span>
              <span class="stat-value">{{ formatNumber(checkin.hips) }} in</span>
            </div>
            <div v-if="checkin.biceps" class="stat">
              <span class="stat-label">Biceps</span>
              <span class="stat-value">{{ formatNumber(checkin.biceps) }} in</span>
            </div>
            <div v-if="checkin.thighs" class="stat">
              <span class="stat-label">Thighs</span>
              <span class="stat-value">{{ formatNumber(checkin.thighs) }} in</span>
            </div>
          </div>

          <div v-if="checkin.notes" class="checkin-notes">
            {{ checkin.notes }}
          </div>
        </div>

        <div v-if="checkins.length === 0" class="empty-state">
          <Icon name="mdi:scale-bathroom" size="48" />
          <p>No check-ins yet</p>
          <BaseButton variant="primary" @click="openNewCheckinModal">
            Log Your First Check-in
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Check-in Modal -->
    <div v-if="showCheckinModal" class="modal-overlay" @click.self="closeCheckinModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ isEditingCheckin ? 'Edit Check-in' : 'Log Check-in' }}</h2>
          <button class="close-btn" @click="closeCheckinModal">
            <Icon name="mdi:close" size="24" />
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Date</label>
            <input v-model="checkinForm.checkin_date" type="date" />
          </div>

          <div class="form-group">
            <label>Weight (lbs) *</label>
            <input v-model.number="checkinForm.weight" type="number" step="0.1" placeholder="0.0" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Waist (in)</label>
              <input
                v-model.number="checkinForm.waist"
                type="number"
                step="0.1"
                placeholder="0.0"
              />
            </div>
            <div class="form-group">
              <label>Chest (in)</label>
              <input
                v-model.number="checkinForm.chest"
                type="number"
                step="0.1"
                placeholder="0.0"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Hips (in)</label>
              <input v-model.number="checkinForm.hips" type="number" step="0.1" placeholder="0.0" />
            </div>
            <div class="form-group">
              <label>Biceps (in)</label>
              <input
                v-model.number="checkinForm.biceps"
                type="number"
                step="0.1"
                placeholder="0.0"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Thighs (in)</label>
            <input v-model.number="checkinForm.thighs" type="number" step="0.1" placeholder="0.0" />
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="checkinForm.notes" placeholder="Any notes..." rows="3"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <BaseButton variant="secondary" @click="closeCheckinModal">Cancel</BaseButton>
          <BaseButton variant="primary" :loading="isSubmitting" @click="submitCheckin">
            {{ isEditingCheckin ? 'Update' : 'Save' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <DeleteConfirmModal
      :show="showDeleteConfirmModal"
      title="Delete Check-in"
      message="Are you sure you want to delete this check-in? This action cannot be undone."
      :is-loading="false"
      @confirm="deleteCheckin"
      @cancel="cancelDeleteCheckin"
    />
  </PageLayout>
</template>

<style scoped>
.checkins-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: flex-end;
}

.checkins-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.checkin-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
}

.checkin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.checkin-date {
  font-weight: 600;
  color: var(--color-text-primary);
}

.checkin-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 6px;
  cursor: pointer;
}

.action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.action-btn.delete:hover {
  color: var(--color-error);
}

.checkin-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.checkin-notes {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--color-text-muted);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 6px;
  cursor: pointer;
}

.close-btn:hover {
  background: var(--color-bg-hover);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
</style>
