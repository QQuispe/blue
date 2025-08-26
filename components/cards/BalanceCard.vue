<script setup>
// We'll replace these with real data later
const balance = {
  amount: 5249.80,
  currency: 'USD',
  change: 12.5 // Percentage change
}
</script>

<template>
  <div class="balance-card">
    <div class="balance-header">
      <h3 class="title">Total Balance</h3>
      <span class="change-indicator positive">
        +{{ balance.change }}%
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 15l-6-6-6 6"/>
        </svg>
      </span>
    </div>
    <div class="balance-amount">
      <span class="currency">{{ balance.currency }}</span>
      {{ balance.amount.toLocaleString(undefined, {minimumFractionDigits: 2}) }}
    </div>
  </div>
</template>

<style scoped>
.balance-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  color: white;
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

.change-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
}

.change-indicator.positive {
  color: #10b981;
  background-color: #ecfdf5;
}

.balance-amount {
  font-size: 2rem;
  font-weight: 600;
  color: #18ffc1;
  letter-spacing: -0.025em;
}

.currency {
  font-size: 1rem;
  color: white;
  margin-right: 0.25rem;
}
</style>
