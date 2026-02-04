<script setup lang="ts">
import { ref, type Ref } from 'vue'
import BaseButton from '~/components/BaseButton.vue'

const props = defineProps<{
  search: string
  account: string | null
  datePreset: string
  sort: string
  accounts: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  (e: 'update:search', value: string): void
  (e: 'update:account', value: string | null): void
  (e: 'update:datePreset', value: string): void
  (e: 'update:sort', value: string): void
}>()

const datePresets = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'mtd', label: 'This Month' },
  { value: 'lm', label: 'Last Month' },
  { value: 'ytd', label: 'This Year' },
]

const sortOptions = [
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'amount-desc', label: 'Highest' },
  { value: 'amount-asc', label: 'Lowest' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
]

const handleSearchInput = (e: Event) => {
  emit('update:search', (e.target as HTMLInputElement).value)
}

const handleClearFilters = () => {
  emit('update:search', '')
  emit('update:account', null)
  emit('update:datePreset', '30d')
  emit('update:sort', 'date-desc')
}
</script>

<template>
  <div class="filters-bar">
    <div class="filter-group search-group">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        type="text"
        :value="search"
        placeholder="Search..."
        @input="handleSearchInput"
        class="search-input"
      />
    </div>

    <div class="filter-group">
      <select :value="datePreset" @change="(e) => emit('update:datePreset', (e.target as HTMLSelectElement).value)" class="filter-select">
        <option v-for="preset in datePresets" :key="preset.value" :value="preset.value">
          {{ preset.label }}
        </option>
      </select>
    </div>

    <div class="filter-group">
      <select :value="account || ''" @change="(e) => emit('update:account', (e.target as HTMLSelectElement).value || null)" class="filter-select">
        <option value="">All Accounts</option>
        <option v-for="acc in accounts" :key="acc.id" :value="acc.id.toString()">{{ acc.name }}</option>
      </select>
    </div>

    <div class="filter-group">
      <select :value="sort" @change="(e) => emit('update:sort', (e.target as HTMLSelectElement).value)" class="filter-select">
        <option v-for="option in sortOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <BaseButton variant="secondary" size="sm" @click="handleClearFilters" title="Reset filters">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
      Reset
    </BaseButton>
  </div>
</template>

<style scoped>
.filters-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  flex-wrap: nowrap;
  height: 42px;
  box-sizing: border-box;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-group {
  flex: 1;
  min-width: 120px;
}

.search-group svg {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 6px 10px;
  color: var(--color-text-primary);
  font-size: 0.8125rem;
  outline: none;
  min-width: 0;
}

.search-input:focus {
  border-color: var(--color-accent);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.filter-select {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 5px 8px;
  color: var(--color-text-primary);
  font-size: 0.75rem;
  cursor: pointer;
  min-width: 90px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-accent);
}
</style>
