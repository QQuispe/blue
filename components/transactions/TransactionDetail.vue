<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import { formatCategoryName } from '~/utils/categoryMap'

interface Transaction {
  id: number
  date: string
  name: string
  amount: number
  category: string | null
  account_id: number
  account_name: string
  account_type: string
  pending: boolean
  logo_url: string | null
}

const props = defineProps<{
  transaction: Transaction
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

const formatAmount = (amount: number): string => {
  const formatted = Math.abs(amount).toFixed(2)
  return amount < 0 ? `-$${formatted}` : `+$${formatted}`
}

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

watch(() => props.transaction, () => {
  // Scaffold: Initialize form fields when transaction changes
}, { immediate: true })

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="detail-backdrop" @click="handleBackdropClick">
    <div class="detail-panel">
      <div class="panel-header">
        <h2>Transaction Details</h2>
        <button class="close-btn" @click="emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="panel-content">
        <div class="amount-section">
          <span class="amount" :class="{ 'negative': transaction.amount < 0 }">
            {{ formatAmount(transaction.amount) }}
          </span>
          <span v-if="transaction.pending" class="pending-badge">Pending</span>
        </div>

        <div class="detail-section">
          <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">{{ formatDate(transaction.date) }}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Merchant</span>
            <span class="detail-value">{{ transaction.name }}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Category</span>
            <span class="detail-value category">
              {{ formatCategoryName(transaction.category) }}
            </span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Account</span>
            <span class="detail-value">{{ transaction.account_name }}</span>
          </div>
        </div>

        <!-- Scaffold for editing - to be implemented -->
        <div class="edit-section">
          <h3>Edit Transaction</h3>
          <p class="edit-note">
            Editing features coming soon.
          </p>
          
          <div class="form-group">
            <label>Category</label>
            <input
              type="text"
              :value="transaction.category || ''"
              placeholder="Enter category"
              disabled
              class="edit-input"
            />
          </div>
          
          <div class="form-group">
            <label>Notes</label>
            <textarea placeholder="Add notes..." disabled class="edit-textarea"></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
}

.detail-panel {
  width: 400px;
  max-width: 100%;
  height: 100%;
  background: var(--color-bg-card);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.panel-header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.amount-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.amount {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-success);
}

.amount.negative {
  color: var(--color-text-primary);
}

.pending-badge {
  padding: 4px 10px;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.detail-label {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.detail-value {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  text-align: right;
}

.detail-value.category {
  color: var(--color-accent);
}

.edit-section {
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.edit-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.edit-note {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.edit-select, .edit-input, .edit-textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.edit-select:disabled, .edit-input:disabled, .edit-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-textarea {
  min-height: 80px;
  resize: vertical;
}
</style>
