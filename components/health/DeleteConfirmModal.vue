<script setup lang="ts">
import BaseModal from './BaseModal.vue'

interface Props {
  show: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm Delete',
  confirmText: 'Delete',
  cancelText: 'Cancel',
  isLoading: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <BaseModal :show="show" :title="title" size="sm" @close="emit('cancel')">
    <div class="delete-confirm-content">
      <div class="warning-icon">
        <Icon name="mdi:alert-circle" size="32" />
      </div>
      <p class="message">{{ message }}</p>
    </div>

    <template #footer>
      <button class="btn btn-secondary" :disabled="isLoading" @click="emit('cancel')">
        {{ cancelText }}
      </button>
      <button class="btn btn-danger" :disabled="isLoading" @click="emit('confirm')">
        <span v-if="isLoading" class="spinner"></span>
        {{ confirmText }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.delete-confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.warning-icon {
  color: var(--color-error);
}

.message {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  line-height: 1.5;
  margin: 0;
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

.btn-danger {
  background: var(--color-error);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
