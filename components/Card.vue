<template>
  <div class="card" :class="{ 'card-clickable': clickable, 'card-hover': hover }">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  clickable?: boolean
  hover?: boolean
}

withDefaults(defineProps<Props>(), {
  clickable: false,
  hover: true,
})
</script>

<style scoped>
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.card-hover:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border-hover);
}

.card-clickable {
  cursor: pointer;
}
</style>
