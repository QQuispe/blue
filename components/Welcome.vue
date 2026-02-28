<script setup lang="ts">
import { computed, type Ref } from 'vue'
import { useAuth } from '~/composables/useAuth'

interface User {
  id: number
  username: string
  email?: string
  isAdmin: boolean
}

const { user }: { user: Ref<User | null> } = useAuth()
const username = computed((): string => user.value?.username || 'Guest')
</script>

<template>
  <div class="welcome-container">
    <h1 class="welcome-text">Welcome, {{ username }}</h1>
  </div>
</template>

<style scoped>
.welcome-container {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.welcome-text {
  font-size: 1.5rem;
  font-weight: 500;
  color: white;
}
</style>
