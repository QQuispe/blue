<script setup lang="ts">
const props = defineProps<{
  totalCount: number
  totalSpend: number
}>()

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(value))
}
</script>

<template>
  <div class="summary-bar">
    <div class="summary-item">
      <span class="summary-label">Transactions</span>
      <span class="summary-value">{{ totalCount.toLocaleString() }}</span>
    </div>
    
    <div class="summary-divider"></div>
    
    <div class="summary-item">
      <span class="summary-label">Total Spend</span>
      <span class="summary-value spend">{{ formatCurrency(totalSpend) }}</span>
    </div>
  </div>
</template>

<style scoped>
.summary-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 10px 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  height: 42px;
  box-sizing: border-box;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.summary-label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.summary-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.summary-value.spend {
  color: var(--color-success);
}

.summary-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}
</style>
