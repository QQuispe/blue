<script setup lang="ts">
interface Props {
  feature?: string
}

const props = withDefaults(defineProps<Props>(), {
  feature: 'this feature',
})

const router = useRouter()
</script>

<template>
  <div class="setup-required">
    <div class="setup-card">
      <div class="setup-icon">
        <Icon name="mdi:heart-pulse" size="48" />
      </div>
      <h2>Setup Required</h2>
      <p>Complete your health profile to use {{ props.feature }}.</p>
      <p class="sub-text">We need to know your weight and goals to personalize your experience.</p>
      <BaseButton variant="primary" @click="router.push('/health/setup')"> Set Up Now </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.setup-required {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 40px;
}

.setup-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  max-width: 400px;
}

.setup-icon {
  color: var(--color-accent);
  margin-bottom: 16px;
}

h2 {
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

p {
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.sub-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 24px;
}
</style>
