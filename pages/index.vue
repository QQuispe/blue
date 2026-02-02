<script setup>
import { ref } from "vue";
import TransactionTable from "~/components/TransactionTable.vue";
import Dashboard from "~/components/Dashboard.vue";

const transactionTableRef = ref(null);
const dashboardRef = ref(null);
</script>

<template>
  <Dashboard ref="dashboardRef" />
  <TransactionTable ref="transactionTableRef" />
</template>

<style scoped>
</style>
