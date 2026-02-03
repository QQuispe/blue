<script setup>
import { ref, onMounted, defineExpose } from 'vue';

const transactions = ref([]);
const isLoading = ref(false);

// Fetch cached transactions from database
const fetchTransactions = async () => {
  isLoading.value = true;
  try {
    const response = await fetch('/api/user/transactions');
    
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    transactions.value = data.transactions || [];
  } catch (error) {
    // Error fetching transactions
  } finally {
    isLoading.value = false;
  }
};

// Fetch transactions on mount
onMounted(() => {
  fetchTransactions();
});

// Format category for display (e.g., "FOOD_AND_DRINK_FAST_FOOD" -> "Fast Food")
const formatCategory = (category) => {
  if (!category || category === '') return 'Uncategorized';
  
  // Split by underscore and take the last part (most specific)
  const parts = category.split('_');
  const lastPart = parts[parts.length - 1];
  
  // Convert to title case and replace underscores with spaces
  return lastPart
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
};

// Expose method to parent so it can trigger refresh after sync
defineExpose({
  refresh: fetchTransactions
});
</script>

<template>
  <div class="transactions-section">
    <h2>Recent Transactions</h2>
    <button @click="fetchTransactions" :disabled="isLoading" class="refresh-btn">
      {{ isLoading ? 'Loading...' : 'Refresh' }}
    </button>
    
    <div v-if="isLoading" class="loading">Loading transactions...</div>
    
    <table v-else-if="transactions.length" class="transactions-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Account</th>
          <th>Name</th>
          <th>Category</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="txn in transactions" :key="txn.plaid_transaction_id">
          <td>{{ txn.date }}</td>
          <td>{{ txn.account_name || 'Unknown' }}</td>
          <td>
            <div class="merchant-cell">
              <img v-if="txn.logo_url" :src="txn.logo_url" alt="" class="merchant-logo" />
              <span class="merchant-name">{{ txn.name }}</span>
            </div>
          </td>
          <td>{{ formatCategory(txn.category) }}</td>
          <td :class="{ 'negative': txn.amount > 0 }">${{ txn.amount }}</td>
          <td>
            <span v-if="txn.pending" class="pending-badge">Pending</span>
            <span v-else class="posted-badge">Posted</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="no-data">No transactions available. Connect a bank account to see transactions.</p>
  </div>
</template>

<style scoped>
.transactions-section {
  margin-top: 30px;
  padding: 20px;
  background: var(--color-bg-card);
  border-radius: 10px;
}

.refresh-btn {
  margin-bottom: 15px;
  padding: 8px 16px;
  background: var(--color-success);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.refresh-btn:hover {
  background: var(--color-accent-dark);
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.transactions-table th,
.transactions-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.transactions-table th {
  font-weight: 600;
  color: var(--color-success);
}

.negative {
  color: var(--color-error);
}

.pending-badge {
  background: var(--color-warning);
  color: #000;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.posted-badge {
  background: var(--color-success);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.loading,
.no-data {
  padding: 20px;
  text-align: center;
  color: var(--color-text-muted);
}

.merchant-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.merchant-logo {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: contain;
  flex-shrink: 0;
}

.merchant-name {
  line-height: 1.4;
}
</style>