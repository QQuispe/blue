<script setup lang="ts">
import { useHealthData } from '~/composables/useHealthData'
import BaseModal from './BaseModal.vue'

const {
  showEditTargetsModal,
  editTargets,
  isSavingTargets,
  openEditTargets,
  saveTargets,
  closeEditTargetsModal,
} = useHealthData()

defineExpose({
  show: showEditTargetsModal,
  open: openEditTargets,
})
</script>

<template>
  <BaseModal
    :show="showEditTargetsModal"
    title="Edit Daily Targets"
    size="sm"
    @close="closeEditTargetsModal"
  >
    <p class="modal-description">
      Override your auto-calculated targets. Leave blank to use calculated values.
    </p>

    <div class="form-row">
      <div class="form-group">
        <label>Calories</label>
        <input v-model.number="editTargets.calories" type="number" placeholder="2000" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Protein (g)</label>
        <input v-model.number="editTargets.protein" type="number" placeholder="120" />
      </div>
      <div class="form-group">
        <label>Carbs (g)</label>
        <input v-model.number="editTargets.carbs" type="number" placeholder="200" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Fat (g)</label>
        <input v-model.number="editTargets.fat" type="number" placeholder="65" />
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" :disabled="isSavingTargets" @click="closeEditTargetsModal">
        Cancel
      </button>
      <button class="btn btn-primary" :disabled="isSavingTargets" @click="saveTargets">
        {{ isSavingTargets ? 'Saving...' : 'Save Targets' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.modal-description {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0 0 20px;
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

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  min-width: 80px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-dark);
}
</style>
