<script setup lang="ts">
import Dashboard from "~/components/Dashboard.vue";

definePageMeta({
  middleware: 'auth'
});
</script>

<template>
  <Dashboard />
</template>