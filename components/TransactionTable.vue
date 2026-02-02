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
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="txn in transactions" :key="txn.plaid_transaction_id">
          <td>{{ txn.date }}</td>
          <td>{{ txn.account_name || 'Unknown' }}</td>
          <td>{{ txn.name }}</td>
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
  background: #151515;
  border-radius: 10px;
}

.refresh-btn {
  margin-bottom: 15px;
  padding: 8px 16px;
  background: #3EB489;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.refresh-btn:hover {
  background: #059669;
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
  color: #3EB489;
}

.negative {
  color: #ef4444;
}

.pending-badge {
  background: #fbbf24;
  color: #000;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.posted-badge {
  background: #3EB489;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.loading,
.no-data {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}
</style>