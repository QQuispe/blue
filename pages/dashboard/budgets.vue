<script setup lang="ts">
import { ref, computed, watch, type Ref, nextTick } from 'vue'
import BaseButton from '~/components/BaseButton.vue'
import { budgetCategories } from '~/composables/useBudgetCategories'
import { formatCurrency, formatDate, getProgressColorClass, getRiskColorClass, getCategoryIcon } from '~/utils/formatters'
import { useBudgetProgress } from '~/composables/useBudgetProgress'

interface Budget {
  id: number
  category: string
  budgetAmount: number
  spentAmount: number
  remainingAmount: number
  percentageUsed: number
  isFavorited?: boolean
  month?: string
}

interface Transaction {
  id: number
  name: string
  amount: number
  date: string
  account_name?: string
}

const currentMonth = new Date().toISOString().slice(0, 7)
const selectedMonth = ref(currentMonth)

const showModal: Ref<boolean> = ref(false)
const editingBudget: Ref<Budget | null> = ref(null)
const showDeleteConfirm: Ref<boolean> = ref(false)
const budgetToDelete: Ref<Budget | null> = ref(null)
const showTransactionsModal: Ref<boolean> = ref(false)
const selectedBudgetTransactions: Ref<Transaction[]> = ref([])
const selectedBudgetCategory: Ref<string> = ref('')
const loadingTransactions: Ref<boolean> = ref(false)
const $toast = useNuxtApp().$toast

const { data: monthsData } = await useFetch<{ months: string[] }>('/api/user/budgets/months', {
  credentials: 'include',
  default: () => ({ months: [] })
})

const availableMonths = computed(() => monthsData.value?.months || [])
const allMonths = computed(() => {
  const currentMonthStr = new Date().toISOString().slice(0, 7)
  
  // Filter to only show months with budgets, up to current month (no future months)
  const validMonths = availableMonths.value.filter(m => m <= currentMonthStr)
  
  // Sort descending (most recent first)
  return validMonths.sort().reverse()
})

watch(selectedMonth, () => {
  refreshBudgets()
})

const refreshBudgets = () => {
  refresh()
}

const { data: response, pending, error, refresh } = await useFetch('/api/user/budgets', {
  credentials: 'include',
  query: computed(() => ({ month: selectedMonth.value }))
})

const budgets = computed(() => response.value?.budgets || [])
const isLoading = computed(() => pending.value)
const fetchError = computed(() => error.value)

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(parseInt(year), parseInt(m) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const categoryInputRef: Ref<HTMLInputElement | null> = ref(null)
const showCategoryDropdown: Ref<boolean> = ref(false)
const highlightedIndex: Ref<number> = ref(-1)

const form = ref({
  category: '',
  amount: ''
})

const categories = budgetCategories

const filteredCategories = computed(() => {
  if (!form.value.category.trim()) return categories
  const query = form.value.category.toLowerCase()
  return categories.filter(cat => cat.toLowerCase().includes(query))
})

const selectCategory = (category: string) => {
  form.value.category = category
  highlightedIndex.value = -1
  showCategoryDropdown.value = false
  nextTick(() => {
    document.querySelector<HTMLInputElement>('.number-input-wrapper input')?.focus()
  })
}

const onCategoryInput = () => {
  showCategoryDropdown.value = true
  highlightedIndex.value = 0
}

const onCategoryBlur = () => {
  highlightedIndex.value = -1
  setTimeout(() => {
    showCategoryDropdown.value = false
  }, 200)
}

const onCategoryKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === 'Tab') {
    if (filteredCategories.value.length > 0 && highlightedIndex.value >= 0) {
      e.preventDefault()
      selectCategory(filteredCategories.value[highlightedIndex.value])
    }
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!showCategoryDropdown.value) {
      showCategoryDropdown.value = true
    }
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredCategories.value.length - 1)
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
  }
  if (e.key === 'Escape') {
    showCategoryDropdown.value = false
  }
}

const { getProjectedPercentage, getRiskLevel } = useBudgetProgress()

const totalBudgeted = computed(() => budgets.value.reduce((sum, b) => sum + b.budgetAmount, 0))
const totalSpent = computed(() => budgets.value.reduce((sum, b) => sum + b.spentAmount, 0))
const overBudgetCount = computed(() => budgets.value.filter(b => b.percentageUsed >= 100).length)
const atRiskCount = computed(() => budgets.value.filter(b => {
  const projected = getProjectedPercentage(b)
  return projected >= 80 && projected < 100
}).length)

const sortedBudgets = computed(() => {
  return [...budgets.value]
    .map(budget => ({
      ...budget,
      projectedPercentage: getProjectedPercentage(budget),
      riskLevel: getRiskLevel(budget)
    }))
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 }
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
    })
})

const openAddModal = () => {
  editingBudget.value = null
  form.value = { category: '', amount: '' }
  showModal.value = true
}

const openEditModal = (budget: Budget) => {
  editingBudget.value = budget
  form.value = { category: budget.category, amount: budget.budgetAmount.toString() }
  showModal.value = true
}

const saveBudget = async () => {
  if (!form.value.category || !form.value.amount) {
    $toast.error('Please fill in all required fields')
    return
  }

  const exactMatch = categories.find(c => c.toLowerCase() === form.value.category.toLowerCase())
  if (!exactMatch) {
    $toast.error('Please select a valid category from the list')
    return
  }

  try {
    const payload = {
      ...(editingBudget.value && { id: editingBudget.value.id }),
      category: exactMatch,
      amount: parseFloat(form.value.amount)
    }
    
    const url = editingBudget.value 
      ? '/api/user/budgets'
      : '/api/user/budgets'
    
    const method = editingBudget.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.statusMessage || (editingBudget.value ? 'Failed to update budget' : 'Failed to create budget'))
    }

    $toast.success(editingBudget.value ? 'Budget updated' : 'Budget created')
    showModal.value = false
    await refresh()
  } catch (err) {
    $toast.error(err instanceof Error ? err.message : 'Failed to save budget')
  }
}

const toggleFavorite = async (budget: Budget) => {
  try {
    const newFavoritedState = !budget.isFavorited
    const response = await fetch('/api/user/budgets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: budget.id, isFavorited: newFavoritedState })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.statusMessage || 'Failed to update favorite')
    }

    await refresh()
  } catch (err) {
    $toast.error(err instanceof Error ? err.message : 'Failed to update favorite')
  }
}

const confirmDelete = (budget: Budget) => {
  budgetToDelete.value = budget
  showDeleteConfirm.value = true
}

const deleteBudget = async () => {
  if (!budgetToDelete.value) return

  try {
    const response = await fetch('/api/user/budgets', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: budgetToDelete.value.id })
    })

    if (!response.ok) {
      throw new Error('Failed to delete budget')
    }

    $toast.success('Budget deleted')
    showDeleteConfirm.value = false
    budgetToDelete.value = null
    await refresh()
  } catch (err) {
    $toast.error(err instanceof Error ? err.message : 'Failed to delete budget')
  }
}

const viewBudgetTransactions = async (budget: Budget) => {
  selectedBudgetCategory.value = budget.category
  selectedBudgetTransactions.value = []
  loadingTransactions.value = true
  showTransactionsModal.value = true

  try {
    const startDate = new Date(parseInt(budget.month!.split('-')[0]), parseInt(budget.month!.split('-')[1]) - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(parseInt(budget.month!.split('-')[0]), parseInt(budget.month!.split('-')[1]), 0).toISOString().split('T')[0]
    
    const response = await $fetch<{ transactions: Transaction[] }>('/api/user/budget-transactions', {
      credentials: 'include',
      query: {
        category: budget.category,
        startDate,
        endDate
      }
    })
    
    selectedBudgetTransactions.value = response.transactions || []
  } catch (err) {
    $toast.error('Failed to load transactions')
  } finally {
    loadingTransactions.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Budgets</h1>
      <div class="header-actions">
        <div class="month-selector">
          <Icon name="mdi:calendar-month" size="18" class="month-icon" />
          <span class="month-display">{{ formatMonth(selectedMonth) }}</span>
          <Icon name="mdi:chevron-down" size="16" class="dropdown-arrow" />
          <select v-model="selectedMonth" class="month-select">
            <option v-for="month in allMonths" :key="month" :value="month">
              {{ formatMonth(month) }}
            </option>
          </select>
        </div>
        <BaseButton variant="primary" @click="openAddModal">
          <Icon name="mdi:plus" size="16" />
          Add Budget
        </BaseButton>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Total Budgeted</span>
        <span class="stat-value">{{ formatCurrency(totalBudgeted) }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Spent</span>
        <span class="stat-value">{{ formatCurrency(totalSpent) }}</span>
      </div>
      <div class="stat-card" :class="{ warning: atRiskCount > 0 }">
        <span class="stat-label">On Watch</span>
        <span class="stat-value">{{ atRiskCount }}</span>
      </div>
      <div class="stat-card" :class="{ danger: overBudgetCount > 0 }">
        <span class="stat-label">Over Budget</span>
        <span class="stat-value">{{ overBudgetCount }}</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <span>Loading budgets...</span>
    </div>

    <div v-else-if="error" class="error-container">
      <span>{{ error.message || 'Failed to load budgets' }}</span>
    </div>

    <div v-else-if="budgets.length === 0" class="empty-container">
      <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      <h3>No budgets yet</h3>
      <p>Create your first budget to start tracking your spending</p>
      <BaseButton variant="primary" @click="openAddModal">Create Budget</BaseButton>
    </div>

    <div v-else class="budget-list" :key="selectedMonth">
      <div 
        v-for="budget in sortedBudgets" 
        :key="budget.id"
        class="budget-card"
        :class="{ 'at-risk': budget.riskLevel !== 'low', favorited: budget.isFavorited }"
      >
        <div class="budget-header">
          <div class="budget-category">
            <Icon :name="getCategoryIcon(budget.category)" size="18" class="category-icon" />
            <div class="category-info">
              <span class="category-name">{{ budget.category }}</span>
              <button class="action-btn favorite" :class="{ active: budget.isFavorited }" @click="toggleFavorite(budget)" title="Favorite">
                <Icon :name="budget.isFavorited ? 'mdi:star' : 'mdi:star-outline'" size="16" />
              </button>
            </div>
          </div>
          <div class="budget-actions">
            <button class="action-btn" @click="viewBudgetTransactions(budget)" title="View Transactions">
              <Icon name="mdi:view-list" size="16" />
            </button>
            <button class="action-btn" @click="openEditModal(budget)" title="Edit">
              <Icon name="mdi:pencil" size="16" />
            </button>
            <button class="action-btn danger" @click="confirmDelete(budget)" title="Delete">
              <Icon name="mdi:delete" size="16" />
            </button>
          </div>
        </div>
        <div class="budget-amounts">
          <span class="spent">{{ formatCurrency(budget.spentAmount) }}</span>
          <span class="divider">/</span>
          <span class="budget">{{ formatCurrency(budget.budgetAmount) }}</span>
        </div>
        <div class="budget-bar-container">
          <div class="budget-bar">
            <div 
              class="budget-bar-fill"
              :class="getProgressColorClass(budget.percentageUsed)"
              :style="{ width: `${Math.min(budget.percentageUsed, 100)}%` }"
            ></div>
          </div>
          <div class="budget-stats">
            <span class="percentage" :class="getProgressColorClass(budget.percentageUsed)">
              {{ budget.percentageUsed.toFixed(0) }}%
            </span>
            <span class="projection">
              Pace: <span :class="getRiskColorClass(budget.riskLevel)">{{ budget.projectedPercentage.toFixed(0) }}%</span>
            </span>
          </div>
        </div>
        <div v-if="budget.riskLevel !== 'low'" class="risk-badge" :class="getRiskColorClass(budget.riskLevel)">
          {{ budget.riskLevel === 'high' ? 'Over pace' : 'On watch' }}
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ editingBudget ? 'Edit Budget' : 'New Budget' }}</h3>
          <button class="close-btn" @click="showModal = false">
            <Icon name="mdi:close" size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Category *</label>
            <div class="combobox-wrapper">
              <input 
                ref="categoryInputRef"
                v-model="form.category"
                type="text"
                placeholder="Select or type category"
                class="combobox-input"
                @input="onCategoryInput"
                @blur="onCategoryBlur"
                @keydown="onCategoryKeydown"
                @focus="showCategoryDropdown = true"
              />
              <div v-if="showCategoryDropdown && filteredCategories.length > 0" class="combobox-dropdown">
                <button 
                  v-for="(cat, index) in filteredCategories" 
                  :key="cat"
                  class="combobox-option"
                  :class="{ active: index === highlightedIndex }"
                  @mousedown.prevent="selectCategory(cat)"
                  @mouseenter="highlightedIndex = index"
                >
                  {{ cat }}
                </button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>Budget Amount *</label>
            <div class="number-input-wrapper">
              <input v-model="form.amount" type="number" step="0.01" placeholder="0.00" />
              <div class="spinner-buttons">
                <button type="button" @click="form.amount = (parseFloat(form.amount || '0') + 10).toString()">
                  <Icon name="mdi:chevron-up" size="14" />
                </button>
                <div class="spinner-divider"></div>
                <button type="button" @click="form.amount = Math.max(0, parseFloat(form.amount || '0') - 10).toString()">
                  <Icon name="mdi:chevron-down" size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
          <BaseButton variant="primary" @click="saveBudget">
            {{ editingBudget ? 'Update' : 'Create' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
      <div class="modal danger-modal" @click.stop>
        <div class="modal-header">
          <h3>Delete Budget</h3>
          <button class="close-btn" @click="showDeleteConfirm = false">
            <Icon name="mdi:close" size="20" />
          </button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete the <strong>{{ budgetToDelete?.category }}</strong> budget?</p>
          <p class="warning">This action cannot be undone.</p>
        </div>
        <div class="modal-footer">
          <BaseButton variant="secondary" @click="showDeleteConfirm = false">Cancel</BaseButton>
          <BaseButton variant="danger" @click="deleteBudget">Delete</BaseButton>
        </div>
      </div>
    </div>

    <div v-if="showTransactionsModal" class="modal-overlay" @click="showTransactionsModal = false">
      <div class="modal transactions-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedBudgetCategory }} Transactions</h3>
          <button class="close-btn" @click="showTransactionsModal = false">
            <Icon name="mdi:close" size="20" />
          </button>
        </div>
        <div class="modal-body transactions-body">
          <div v-if="loadingTransactions" class="loading-state">
            <div class="loading-spinner"></div>
            <span>Loading transactions...</span>
          </div>
          <div v-else-if="selectedBudgetTransactions.length === 0" class="empty-state">
            <Icon name="mdi:view-list" size="32" class="empty-icon" />
            <span>No transactions found for this category</span>
          </div>
          <div v-else class="transactions-list">
            <div 
              v-for="tx in selectedBudgetTransactions" 
              :key="tx.id"
              class="transaction-item"
            >
              <div class="transaction-info">
                <span class="transaction-name">{{ tx.name }}</span>
                <span class="transaction-date">{{ formatDate(tx.date) }}</span>
              </div>
              <span class="transaction-amount">{{ formatCurrency(tx.amount) }}</span>
            </div>
          </div>
        </div>
        <div v-if="selectedBudgetTransactions.length > 0" class="modal-footer">
          <span class="total-label">Total: {{ formatCurrency(selectedBudgetTransactions.reduce((sum, t) => sum + t.amount, 0)) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 16px;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  color: var(--color-text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  position: relative;
  min-width: 160px;
}

.month-selector:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-subtle);
}

.month-icon {
  color: var(--color-text-muted);
  pointer-events: none;
  z-index: 1;
}

.month-select {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-left: 40px;
  padding-right: 32px;
  opacity: 0;
}

.month-select:focus {
  outline: none;
}

.dropdown-arrow {
  color: var(--color-text-muted);
  pointer-events: none;
  z-index: 1;
}

.month-display {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
  z-index: 1;
  pointer-events: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.warning {
  border-color: var(--color-warning);
  background: rgba(245, 158, 11, 0.05);
}

.stat-card.danger {
  border-color: var(--color-error);
  background: rgba(239, 68, 68, 0.05);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: var(--color-text-muted);
}

.error-container {
  color: var(--color-error);
}

.empty-container {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.empty-icon {
  opacity: 0.5;
}

.empty-container h3 {
  margin: 0;
  color: var(--color-text-primary);
}

.empty-container p {
  margin: 0;
  font-size: 0.875rem;
}

.budget-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.favorites-section,
.all-budgets-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.view-all-link {
  text-align: center;
}

.view-all-link a {
  color: var(--color-accent);
  font-size: 0.875rem;
  text-decoration: none;
}

.view-all-link a:hover {
  text-decoration: underline;
}

.budget-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.budget-list > * {
  flex: 1 1 300px;
  max-width: calc(50% - 8px);
}

.budget-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.budget-card:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-card-hover);
}

.budget-card.at-risk {
  border-left: 3px solid var(--color-warning);
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.budget-category {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-name {
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: 0.9375rem;
}

.category-info .favorite {
  width: 20px;
  height: 20px;
  padding: 0;
}

.budget-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.action-btn.favorite.active {
  color: #f59e0b;
}

.action-btn.favorite:hover {
  color: #f59e0b;
}

.budget-amounts {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.budget-amounts .spent {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.budget-amounts .divider {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.budget-amounts .budget {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.budget-bar-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.budget-bar {
  height: 8px;
  background: var(--color-bg-hover);
  border-radius: 4px;
  overflow: hidden;
}

.budget-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.budget-bar-fill.good {
  background: linear-gradient(90deg, #10b981, #059669);
}

.budget-bar-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.budget-bar-fill.over-budget {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.budget-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-stats .percentage {
  font-size: 0.875rem;
  font-weight: 600;
}

.budget-stats .percentage.good {
  color: #10b981;
}

.budget-stats .percentage.warning {
  color: #f59e0b;
}

.budget-stats .percentage.over-budget {
  color: #ef4444;
}

.budget-stats .projection {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.budget-stats .projection .risk-low {
  color: #10b981;
}

.budget-stats .projection .risk-medium {
  color: #f59e0b;
}

.budget-stats .projection .risk-high {
  color: #ef4444;
}

.risk-badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 8px;
}

.risk-badge.risk-low {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.risk-badge.risk-medium {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.risk-badge.risk-high {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.combobox-wrapper {
  position: relative;
}

.combobox-input {
  width: 100%;
  padding: 10px 12px;
  padding-right: 36px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  outline: none;
}

.combobox-input:focus {
  border-color: var(--color-accent);
}

.combobox-input::placeholder {
  color: var(--color-text-muted);
}

.combobox-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.combobox-option {
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.combobox-option:hover,
.combobox-option.active {
  background: var(--color-bg-subtle);
}

.combobox-option:first-child {
  border-radius: 6px 6px 0 0;
}

.combobox-option:last-child {
  border-radius: 0 0 6px 6px;
}

/* Number Input with Spinner Buttons */
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

.number-input-wrapper input[type="number"] {
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

.number-input-wrapper input[type="number"]::-webkit-inner-spin-button,
.number-input-wrapper input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-input-wrapper input[type="number"] {
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
  background: var(--color-primary-bg);
  color: var(--color-primary);
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

.modal-body p {
  margin: 0 0 8px 0;
  color: var(--color-text-secondary);
}

.modal-body .warning {
  color: var(--color-error);
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
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
  max-width: 420px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.125rem;
  font-weight: 600;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.danger-modal .modal-header {
  border-bottom-color: var(--color-error);
}

.danger-modal .modal-header h3 {
  color: var(--color-error);
}

.transactions-modal {
  max-width: 480px;
}

.transactions-modal .modal-header {
  border-bottom-color: var(--color-border);
}

.transactions-modal .modal-body {
  padding: 0;
  max-height: 400px;
  overflow-y: auto;
}

.transactions-modal .modal-footer {
  border-top: 1px solid var(--color-border);
  justify-content: flex-end;
}

.total-label {
  font-weight: 600;
  color: var(--color-text-primary);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--color-text-muted);
}

.empty-icon {
  opacity: 0.5;
}

.transactions-list {
  display: flex;
  flex-direction: column;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border);
}

.transaction-item:last-child {
  border-bottom: none;
}

.transaction-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.transaction-name {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
}

.transaction-date {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.transaction-amount {
  font-weight: 600;
  color: var(--color-text-primary);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .budget-list {
    grid-template-columns: 1fr;
  }
}
</style>
