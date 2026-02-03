<script setup>
import { ref } from "vue";
import TransactionTable from "~/components/TransactionTable.vue";
import Dashboard from "~/components/Dashboard.vue";

const transactionTableRef = ref(null);
const dashboardRef = ref(null);
</script>

<template>
  <Dashboard ref="dashboardRef" />
  <div class="transaction-wrapper">
    <TransactionTable ref="transactionTableRef" />
  </div>
</template>

<style scoped>
.transaction-wrapper {
  padding: 0 20px 20px 20px;
}
</style>

<style scoped>
</style>
