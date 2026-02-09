<script setup lang="ts">
import { ref, onMounted, computed, type Ref, nextTick } from 'vue'
import BaseButton from '~/components/BaseButton.vue'

definePageMeta({
  middleware: 'auth'
})

interface Budget {
  id: number
  category: string
  budgetAmount: number
  spentAmount: number
  remainingAmount: number
  percentageUsed: number
  isFavorited?: boolean
}

const budgets: Ref<Budget[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const error: Ref<string | null> = ref(null)
const showModal: Ref<boolean> = ref(false)
const editingBudget: Ref<Budget | null> = ref(null)
const showDeleteConfirm: Ref<boolean> = ref(false)
const budgetToDelete: Ref<Budget | null> = ref(null)
const $toast = useNuxtApp().$toast

const categoryInputRef: Ref<HTMLInputElement | null> = ref(null)
const showCategoryDropdown: Ref<boolean> = ref(false)
const highlightedIndex: Ref<number> = ref(-1)

const categories = ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Housing', 'Utilities', 'Healthcare', 'Education', 'Travel', 'Groceries', 'Dining', 'Subscriptions', 'Savings', 'Investments', 'Insurance', 'Gifts', 'Personal', 'Other'].sort()

const form = ref({
  category: '',
  amount: ''
})

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

const fetchBudgets = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await fetch('/api/user/budgets', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch budgets')
    }
    
    const data = await response.json()
    budgets.value = data.budgets || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBudgets()
})

const getDayOfMonth = () => new Date().getDate()
const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

const getProjectedSpending = (budget: Budget): number => {
  const dayOfMonth = getDayOfMonth()
  if (dayOfMonth === 0 || budget.spentAmount === 0) return budget.spentAmount
  return (budget.spentAmount / dayOfMonth) * daysInMonth
}

const getProjectedPercentage = (budget: Budget): number => {
  const projected = getProjectedSpending(budget)
  if (budget.budgetAmount === 0) return 0
  return (projected / budget.budgetAmount) * 100
}

const getRiskLevel = (budget: Budget): 'high' | 'medium' | 'low' => {
  const projected = getProjectedPercentage(budget)
  if (projected >= 100) return 'high'
  if (projected >= 80) return 'medium'
  return 'low'
}

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

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return 'over-budget'
  if (percentage >= 80) return 'warning'
  return 'good'
}

const getRiskColorClass = (riskLevel: string): string => {
  if (riskLevel === 'high') return 'risk-high'
  if (riskLevel === 'medium') return 'risk-medium'
  return 'risk-low'
}

const getCategoryPath = (category: string): string => {
  const paths: Record<string, string> = {
    'Food': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 7h2v6h-2zm0 8h2v2h-2z',
    'Transportation': 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
    'Shopping': 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
    'Entertainment': 'M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3h12a3 3 0 003-3 3 3 0 00-3-3zm-6 5a2 2 0 100 4 2 2 0 000-4zm0 6c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z',
    'Housing': 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    'Utilities': 'M13 2.03v2.02c4.39.54 7.5 4.53 6.96 8.92-.46 3.55-3.46 6.46-6.96 6.92-4.39.54-8.03-2.93-8.03-7.32 0-4.39 3.64-7.36 8.03-7.91zM9 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6-8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
    'Healthcare': 'M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z',
    'Education': 'M5 3v4h-.48c-.66 0-1.21.42-1.42 1.01L2 10v9c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-9l-1.1-1c-.21-.59-.76-1.01-1.42-1.01H19V3H5zm13 9h-2V8h-2v4H8l4 4 4-4z',
    'Travel': 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
    'Groceries': 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
    'Dining': 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
    'Subscriptions': 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9V9h10v2zm-4 4H9V9h10v2z',
    'Savings': 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
    'Investments': 'M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z',
    'Insurance': 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    'Gifts': 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z',
    'Personal': 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    'Other': 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'
  }
  return paths[category] || 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'
}

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
      category: exactMatch,
      amount: parseFloat(form.value.amount)
    }

    const url = editingBudget.value 
      ? `/api/user/budgets?id=${editingBudget.value.id}`
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
    fetchBudgets()
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

    fetchBudgets()
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
    fetchBudgets()
  } catch (err) {
    $toast.error(err instanceof Error ? err.message : 'Failed to delete budget')
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Budgets</h1>
      <BaseButton variant="primary" @click="openAddModal">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Add Budget
      </BaseButton>
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
      <span>{{ error }}</span>
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

    <div v-else class="budget-list">
      <div 
        v-for="budget in sortedBudgets" 
        :key="budget.id"
        class="budget-card"
        :class="{ 'at-risk': budget.riskLevel !== 'low', favorited: budget.isFavorited }"
      >
        <div class="budget-header">
          <div class="budget-category">
            <svg class="category-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path :d="getCategoryPath(budget.category)"/>
            </svg>
            <div class="category-info">
              <span class="category-name">{{ budget.category }}</span>
            </div>
          </div>
          <div class="budget-actions">
            <button class="action-btn favorite" :class="{ active: budget.isFavorited }" @click="toggleFavorite(budget)" title="Favorite">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="budget.isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
            <button class="action-btn" @click="openEditModal(budget)" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn danger" @click="confirmDelete(budget)" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
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
              :class="getProgressColor(budget.percentageUsed)"
              :style="{ width: `${Math.min(budget.percentageUsed, 100)}%` }"
            ></div>
          </div>
          <div class="budget-stats">
            <span class="percentage" :class="getProgressColor(budget.percentageUsed)">
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
          <button class="close-btn" @click="showModal = false">×</button>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 15l-6-6-6 6"/>
                  </svg>
                </button>
                <div class="spinner-divider"></div>
                <button type="button" @click="form.amount = Math.max(0, parseFloat(form.amount || '0') - 10).toString()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
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
          <button class="close-btn" @click="showDeleteConfirm = false">×</button>
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
  text-transform: uppercase;
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.budget-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
}

.budget-card:hover {
  border-color: var(--color-border-hover);
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
  flex-direction: column;
  gap: 2px;
}

.category-name {
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: 0.9375rem;
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
  background: var(--color-bg-hover);
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
  background: var(--color-bg-hover);
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
  background: var(--color-bg-hover);
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
  background: var(--color-border);
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
  background: var(--color-bg-hover);
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

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .budget-list {
    grid-template-columns: 1fr;
  }
}
</style>
