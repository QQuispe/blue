<script setup lang="ts">
import { ref, type Ref } from "vue";
import TransactionTable from "~/components/TransactionTable.vue";
import Dashboard from "~/components/Dashboard.vue";

// Apply auth middleware
definePageMeta({
  middleware: 'auth'
});

const transactionTableRef: Ref<any> = ref(null);
const dashboardRef: Ref<any> = ref(null);
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