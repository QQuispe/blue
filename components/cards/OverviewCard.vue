<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue'

const isLoading: Ref<boolean> = ref(false)

onMounted(() => {
  // TODO: Implement overview metrics
})

const refresh = () => {
  // TODO: Implement refresh
}

defineExpose({ refresh })
</script>

<template>
  <div class="overview-card">
    <div class="card-header">
      <div class="header-left">
        <Icon name="mdi:view-grid" size="18" />
        <h3>Overview</h3>
      </div>
    </div>

    <div class="separator"></div>

    <div class="card-content">
      <div class="placeholder">
        <span>Overview metrics coming soon</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.card-header {
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

h3 {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
}

.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}
</style>
