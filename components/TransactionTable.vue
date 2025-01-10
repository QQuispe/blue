<script setup lang="ts">
const transactions = [
  {
    id: 1,
    date: '2025-01-01',
    description: 'Grocery Store',
    category: 'Food & Dining',
    amount: -45.67,
  },
  {
    id: 2,
    date: '2025-01-02',
    description: 'Electric Bill',
    category: 'Utilities',
    amount: -120.34,
  },
  {
    id: 3,
    date: '2025-01-03',
    description: 'Biweekly Paycheck',
    category: 'Income',
    amount: 1500.0,
  },
  {
    id: 4,
    date: '2025-01-08',
    description: 'Veterinary',
    category: 'Pet',
    amount: 500.0,
  },
  {
    id: 5,
    date: '2025-01-09',
    description: 'Gas',
    category: 'Automotive',
    amount: 50.0,
  },
];
</script>

<template>
  <table class="transaction-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Category</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="transaction in transactions" :key="transaction.id">
        <td>{{ transaction.date }}</td>
        <td>{{ transaction.description }}</td>
        <td>{{ transaction.category }}</td>
        <td
          :class="{
            'transaction-negative': transaction.amount < 0,
            'transaction-positive': transaction.amount > 0,
          }"
        >
          {{
            transaction.amount < 0
              ? `-$${Math.abs(transaction.amount).toFixed(2)}`
              : `$${transaction.amount.toFixed(2)}`
          }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.transaction-table {
  width: 100%;
  border-collapse: separate; /* Ensure separate borders for rounded corners */
  border-spacing: 0;
  border-radius: 6px;
  border: solid white 1px;
}

.transaction-table th,
.transaction-table td {
  border-left: solid rgb(96, 96, 96) 2px;
  border-top: solid rgb(96, 96, 96) 2px;
  padding: 8px;
  text-align: left;
}

.transaction-table th {
  background-color: rgb(66, 66, 66);
  font-weight: bold;
}

.transaction-table tr:hover {
  background-color: rgb(64, 63, 63);
  transition: background-color 0.2s ease;
}

.transaction-table td.transaction-negative {
  color: red;
}

.transaction-table td.transaction-positive {
  color: green;
}
</style>