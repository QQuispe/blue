<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import { getLogger } from '~/utils/logger'

const logger = getLogger()

import BaseButton from '~/components/BaseButton.vue'

interface Bill {
  id: number
  name: string
  amount: number
  frequency: string
  nextDueDate: string
  daysUntil: number
  source: string
  type?: string
  isUserManaged: boolean
  isActive: boolean
}

interface SuggestedBill {
  id: number
  name: string
  amount: number
  frequency: string
  confidence: number
  detectedDate: string
}

const bills: Ref<Bill[]> = ref([])
const suggestions: Ref<SuggestedBill[]> = ref([])
const totalDue: Ref<number> = ref(0)
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)
const showAddModal: Ref<boolean> = ref(false)
const showEditModal: Ref<boolean> = ref(false)
const editingBill: Ref<Bill | null> = ref(null)
const newBill: Ref<Partial<Bill>> = ref({
  name: '',
  amount: 0,
  frequency: 'monthly',
  nextDueDate: ''
})

const isSyncing = ref(false)

const syncLiabilities = async () => {
  try {
    isSyncing.value = true
    error.value = null
    
    const response = await fetch('/api/user/liabilities/sync', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to sync liabilities')
    }
    
    const data = await response.json()
    logger.component('BillsCard', 'liabilities_synced', { count: data.count })
    
    // Refresh bills list
    await fetchBills()
  } catch (err) {
    logger.error('BillsCard', 'liabilities_sync_failed', err)
    error.value = err instanceof Error ? err.message : 'Failed to sync liabilities'
  } finally {
    isSyncing.value = false
  }
}

const fetchBills = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await fetch('/api/user/bills', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch bills')
    }
    
    const data = await response.json()
    bills.value = data.bills || []
    suggestions.value = data.suggestions || []
    totalDue.value = data.totalDue || 0
    
    logger.component('BillsCard', 'fetch_success', { count: bills.value.length })
  } catch (err) {
    logger.error('BillsCard', 'fetch_bills_failed', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

const addBill = async () => {
  try {
    const response = await fetch('/api/user/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newBill.value)
    })
    
    if (!response.ok) {
      throw new Error('Failed to add bill')
    }
    
    showAddModal.value = false
    newBill.value = { name: '', amount: 0, frequency: 'monthly', nextDueDate: '' }
    await fetchBills()
    logger.component('BillsCard', 'bill_added', { name: newBill.value.name })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add bill'
  }
}

const updateBill = async () => {
  if (!editingBill.value) return
  
  try {
    const response = await fetch(`/api/user/bills/${editingBill.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        amount: editingBill.value.amount,
        nextDueDate: editingBill.value.nextDueDate,
        isActive: editingBill.value.isActive
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to update bill')
    }
    
    showEditModal.value = false
    editingBill.value = null
    await fetchBills()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update bill'
  }
}

const addSuggestedBill = async (suggestion: SuggestedBill) => {
  try {
    // Calculate next due date based on frequency
    const nextDue = new Date()
    if (suggestion.frequency === 'monthly') {
      nextDue.setMonth(nextDue.getMonth() + 1)
    } else if (suggestion.frequency === 'weekly') {
      nextDue.setDate(nextDue.getDate() + 7)
    }
    
    const response = await fetch('/api/user/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: suggestion.name,
        amount: suggestion.amount,
        frequency: suggestion.frequency,
        nextDueDate: nextDue.toISOString().split('T')[0],
        source: 'pattern_detected'
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to add suggested bill')
    }
    
    await fetchBills()
    logger.component('BillsCard', 'suggestion_added', { name: suggestion.name })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add bill'
  }
}

const ignoreSuggestion = async (suggestionId: number) => {
  try {
    await fetch(`/api/user/bills/suggestions/${suggestionId}/ignore`, {
      method: 'POST',
      credentials: 'include'
    })
    
    suggestions.value = suggestions.value.filter(s => s.id !== suggestionId)
  } catch (err) {
    logger.error('BillsCard', 'ignore_suggestion_failed', err)
  }
}

const openEditModal = (bill: Bill) => {
  editingBill.value = { ...bill }
  showEditModal.value = true
}

const formatDueDate = (dueDate: string, daysUntil: number): string => {
  const date = new Date(dueDate)
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (daysUntil < 0) return `${formatted} (overdue)`
  return formatted
}

const formatAmount = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  })
}

onMounted(() => {
  fetchBills()
})

const activeBills = computed(() => bills.value.filter(b => b.isActive))

// Expose refresh method for parent component
const refresh = () => {
  fetchBills()
}

defineExpose({ refresh })
</script>

<template>
  <div class="bills-card">
    <div class="card-header-row">
      <div class="header-left">
        <Icon name="mdi:calendar-clock" size="18" />
        <h3 class="title">Upcoming Bills</h3>
      </div>
      <div v-if="!isLoading && !error" class="header-right">
        <span class="bill-count">{{ activeBills.length }}</span>
        <BaseButton 
          variant="secondary" 
          size="sm" 
          @click="syncLiabilities"
          :loading="isSyncing"
          title="Sync bills from bank"
        >
          <Icon name="mdi:refresh" size="16" />
        </BaseButton>
        <BaseButton variant="secondary" size="sm" @click="showAddModal = true">
          <Icon name="mdi:plus" size="16" />
        </BaseButton>
      </div>
    </div>
    
    <div class="separator"></div>
    
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading bills...</span>
    </div>
    
    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>
    
    <div v-else-if="activeBills.length === 0 && suggestions.length === 0" class="no-data">
      <Icon name="mdi:calendar-clock" size="32" class="empty-icon" />
      <p>No upcoming bills</p>
      <span>Add bills manually or wait for pattern detection</span>
    </div>
    
    <template v-else>
      <div class="card-content-scrollable">
        <!-- Suggestions -->
        <div v-if="suggestions.length > 0" class="suggestions-section">
          <div class="suggestions-header">
            <span class="suggestions-label">💡 Detected Bills</span>
          </div>
          <div class="suggestions-list">
            <div v-for="suggestion in suggestions.slice(0, 2)" :key="suggestion.id" class="suggestion-item">
              <div class="suggestion-info">
                <span class="suggestion-name">{{ suggestion.name }}</span>
                <span class="suggestion-details">{{ formatAmount(suggestion.amount) }} • {{ suggestion.frequency }}</span>
              </div>
              <div class="suggestion-actions">
                <BaseButton variant="secondary" size="sm" @click="addSuggestedBill(suggestion)">Add</BaseButton>
                <BaseButton variant="ghost" size="sm" @click="ignoreSuggestion(suggestion.id)">Ignore</BaseButton>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Bills List -->
        <div class="bills-list">
          <div 
            v-for="bill in activeBills" 
            :key="bill.id"
            class="bill-item"
          >
            <div class="bill-main">
              <div class="bill-info">
                <span class="bill-name">{{ bill.name }}</span>
                <span class="bill-due" :class="{ overdue: bill.daysUntil < 0 }">{{ formatDueDate(bill.nextDueDate, bill.daysUntil) }}</span>
              </div>
            </div>
            <div class="bill-amount">{{ formatAmount(bill.amount) }}</div>
            <button class="edit-btn" @click="openEditModal(bill)">
              <Icon name="mdi:pencil" size="14" />
            </button>
          </div>
        </div>
      </div>
      
      <!-- Total - Fixed at bottom -->
      <div v-if="activeBills.length > 0" class="total-section-fixed">
        <div class="total-row">
          <span class="total-label">Total Due</span>
          <span class="total-amount">{{ formatAmount(totalDue) }}</span>
        </div>
      </div>
    </template>
    
    <!-- Add Bill Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h4>Add New Bill</h4>
          <button class="close-btn" @click="showAddModal = false">
            <Icon name="mdi:close" size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name</label>
            <input v-model="newBill.name" type="text" placeholder="e.g., Netflix" />
          </div>
          <div class="form-group">
            <label>Amount</label>
            <input v-model="newBill.amount" type="number" step="0.01" placeholder="0.00" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Frequency</label>
              <select v-model="newBill.frequency">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div class="form-group">
              <label>Next Due Date</label>
              <input v-model="newBill.nextDueDate" type="date" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <BaseButton variant="secondary" @click="showAddModal = false">Cancel</BaseButton>
          <BaseButton variant="primary" @click="addBill">Add Bill</BaseButton>
        </div>
      </div>
    </div>
    
    <!-- Edit Bill Modal -->
    <div v-if="showEditModal && editingBill" class="modal-overlay" @click="showEditModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h4>Edit Bill</h4>
          <button class="close-btn" @click="showEditModal = false">
            <Icon name="mdi:close" size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name</label>
            <input v-model="editingBill.name" type="text" disabled />
          </div>
          <div class="form-group">
            <label>Amount</label>
            <input v-model="editingBill.amount" type="number" step="0.01" />
          </div>
          <div class="form-group">
            <label>Next Due Date</label>
            <input v-model="editingBill.nextDueDate" type="date" />
          </div>
          <div class="form-group checkbox">
            <label>
              <input v-model="editingBill.isActive" type="checkbox" />
              Active
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <BaseButton variant="secondary" @click="showEditModal = false">Cancel</BaseButton>
          <BaseButton variant="primary" @click="updateBill">Save Changes</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bills-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  max-height: 335px;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
}

.header-left svg {
  opacity: 0.7;
}

.title {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bill-count {
  background: var(--color-border);
  color: var(--color-text-secondary);
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
  margin: 0;
}

.loading-state, .error-state, .no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  text-align: center;
}

.empty-icon {
  opacity: 0.5;
  color: var(--color-text-secondary);
}

.card-content-scrollable {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* Suggestions */
.suggestions-section {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
}

.suggestions-header {
  margin-bottom: 0.5rem;
}

.suggestions-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-bg-elevated);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.suggestion-item:hover {
  transform: translateY(-2px);
}

.bill-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem;
  background: var(--color-bg-elevated);
  border-radius: 8px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.suggestion-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.suggestion-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.suggestion-details {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.suggestion-actions {
  display: flex;
  gap: 0.25rem;
}

/* Bills List */
.bills-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bill-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem;
  background: var(--color-bg-elevated);
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.bill-item:hover {
  transform: translateY(-2px);
}

.bill-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.bill-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.bill-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bill-due {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.bill-due.overdue {
  color: var(--color-error);
}

.bill-amount {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.edit-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.edit-btn:hover {
  opacity: 1;
  color: var(--color-accent);
}

/* Total Section - Fixed at bottom */
.total-section-fixed {
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  margin-top: auto;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.total-amount {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-text-primary);
}

.modal-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.form-group input,
.form-group select {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-group.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.form-group.checkbox label {
  text-transform: none;
  letter-spacing: normal;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}
</style>
