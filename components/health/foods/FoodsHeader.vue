<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  activeTab: 'all' | 'foods' | 'recipes'
  foodsCount: number
  recipesCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:activeTab': [tab: 'all' | 'foods' | 'recipes']
  'add-food': []
  'add-recipe': []
  search: [query: string]
}>()

const totalCount = computed(() => props.foodsCount + props.recipesCount)

const tabs = computed(() => [
  { key: 'all' as const, label: 'All', count: totalCount.value },
  { key: 'foods' as const, label: 'Foods', count: props.foodsCount },
  { key: 'recipes' as const, label: 'Recipes', count: props.recipesCount },
])

const searchQuery = ref('')

const handleSearch = () => {
  emit('search', searchQuery.value)
}
</script>

<template>
  <div class="foods-header">
    <div class="header-top">
      <div class="title-section">
        <h1>My Foods & Recipes</h1>
        <p class="subtitle">Manage your custom foods and saved recipes</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="emit('add-recipe')">
          <Icon name="mdi:plus" size="18" />
          <span class="btn-label">Recipe</span>
        </button>
        <button class="btn btn-primary" @click="emit('add-food')">
          <Icon name="mdi:plus" size="18" />
          <span class="btn-label">Food</span>
        </button>
      </div>
    </div>

    <div class="header-tabs">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab', { active: activeTab === tab.key }]"
          @click="emit('update:activeTab', tab.key)"
        >
          {{ tab.label }}
          <span class="tab-count">{{ tab.count }}</span>
        </button>
      </div>
      <div class="search-wrapper">
        <Icon name="mdi:magnify" size="20" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search foods & recipes..."
          class="search-input"
          @input="handleSearch"
          @keyup.enter="handleSearch"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.foods-header {
  margin-bottom: 24px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
}

.title-section h1 {
  margin: 0 0 4px 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.subtitle {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--color-text-muted);
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover {
  background: var(--color-accent-dark);
}

.btn-secondary {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-hover);
}

.header-tabs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.tabs {
  display: flex;
  gap: 4px;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s;
}

.tab:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.tab.active {
  color: var(--color-accent);
  background: rgba(59, 130, 246, 0.1);
}

.tab-count {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: var(--color-bg);
  border-radius: 10px;
  color: var(--color-text-muted);
}

.tab.active .tab-count {
  background: var(--color-accent);
  color: white;
}

.search-wrapper {
  position: relative;
  width: 280px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 44px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .header-top {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
    justify-content: center;
  }

  .btn-label {
    display: inline;
  }

  .header-tabs {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .tabs {
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .search-wrapper {
    width: 100%;
  }
}
</style>
