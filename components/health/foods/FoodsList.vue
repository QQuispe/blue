<script setup lang="ts">
import FoodCard from './FoodCard.vue'

interface FoodItem {
  id: number
  name: string
  brand?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_size: number
  serving_unit: string
  type: 'food' | 'recipe'
  ingredients?: any[]
}

interface Props {
  items: FoodItem[]
  loading?: boolean
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyMessage: 'No items found',
})

const emit = defineEmits<{
  edit: [item: FoodItem]
  delete: [item: FoodItem]
  duplicate: [item: FoodItem]
}>()
</script>

<template>
  <div class="foods-list">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <div v-else-if="items.length === 0" class="empty-state">
      <div class="empty-icon">
        <Icon name="mdi:food-off" size="48" />
      </div>
      <p>{{ emptyMessage }}</p>
    </div>

    <div v-else class="cards-grid">
      <FoodCard
        v-for="item in items"
        :key="item.type + '-' + item.id"
        :item="item"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
        @duplicate="emit('duplicate', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.foods-list {
  min-height: 300px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: var(--color-text-muted);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: var(--color-bg-elevated);
  border-radius: 50%;
  margin-bottom: 16px;
  color: var(--color-text-muted);
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--color-text-muted);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
