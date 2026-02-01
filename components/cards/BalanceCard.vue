<script setup>
import { ref, onMounted, computed } from 'vue'

const balanceData = ref(null)
const isLoading = ref(true)
const error = ref(null)

// Fetch balance data from API
const fetchBalance = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await fetch('/api/user/balance', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch balance')
    }
    
    const data = await response.json()
    balanceData.value = data.summary
  } catch (err) {
    console.error('Error fetching balance:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBalance()
})

// Computed properties for display
const displayBalance = computed(() => {
  if (!balanceData.value) return { amount: 0, currency: 'USD', accountCount: 0 }
  
  return {
    amount: balanceData.value.totalCurrent,
    currency: balanceData.value.currency,
    accountCount: balanceData.value.accountCount
  }
})

const formattedAmount = computed(() => {
  return displayBalance.value.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})
</script>

<template>
  <div class="balance-card">
    <div class="balance-header">
      <h3 class="title">Total Balance</h3>
      <span v-if="displayBalance.accountCount > 0" class="account-count">
        {{ displayBalance.accountCount }} account{{ displayBalance.accountCount === 1 ? '' : 's' }}
      </span>
    </div>
    
    <div v-if="isLoading" class="loading-state">
      Loading...
    </div>
    
    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>
    
    <div v-else class="balance-amount">
      <span class="currency">{{ displayBalance.currency }}</span>
      {{ formattedAmount }}
    </div>
    
    <div v-if="!isLoading && !error && displayBalance.accountCount === 0" class="no-accounts">
      No connected accounts
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

.account-count {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.loading-state {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
}

.error-state {
  font-size: 1rem;
  color: #ef4444;
}

.no-accounts {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.5rem;
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
