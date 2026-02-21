<template>
  <div class="quick-stats">
    <div v-for="stat in stats" :key="stat.label" class="quick-stat">
      <div class="stat-icon" :class="stat.color">
        <Icon :name="stat.icon" size="20" />
      </div>
      <div class="stat-info">
        <span class="stat-label">{{ stat.label }}</span>
        <span class="stat-value">{{ stat.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Stat {
  label: string
  value: string | number
  icon: string
  color?: string
}

interface Props {
  stats: Stat[]
}

defineProps<Props>()
</script>

<style scoped>
.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.quick-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.accent {
  background: var(--color-accent-bg);
  color: var(--color-accent);
}

.stat-icon.success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.stat-icon.warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.stat-icon.info {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

@media (max-width: 768px) {
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
