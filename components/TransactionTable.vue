<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  accessToken: String, // Receive the access token from the parent component
});

const transactions = ref([]);

// Fetch transactions based on the provided access token
const fetchTransactions = async () => {
  if (!props.accessToken) {
    console.error("No access token available");
    return;
  }

  try {
    const response = await fetch('/api/plaid/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: props.accessToken })
    });

    if (!response.ok) {
      console.error(`Request failed with status ${response.status}`);
      return;
    }

    const data = await response.json();

    // Debugging
    console.log("Transaction Data:", data)

    transactions.value = data.transactions || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
  }
};

// Watch for changes to the access token and fetch transactions when it changes
watch(() => props.accessToken, (newToken) => {
  if (newToken) {
    fetchTransactions();
  }
});

// Fetch transactions on initial mount if an access token is available
onMounted(() => {
  if (props.accessToken) {
    fetchTransactions();
  }
});
</script>

<template>
  <div>
    <h2>Transactions</h2>
    <table v-if="transactions.length">
      <thead>
        <tr>
          <th>Date</th>
          <th>Merchant</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="txn in transactions" :key="txn.transaction_id">
          <td>{{ txn.date }}</td>
          <td>{{ txn.merchant_name }}</td>
          <td>{{ txn.amount }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No transactions available</p>
  </div>
</template>