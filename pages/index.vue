<script setup lang="ts">
const auth = useAuth()
const router = useRouter()

const navigateToFinance = () => {
  router.push('/finance')
}

const navigateToHealth = () => {
  router.push('/health')
}
</script>

<template>
  <div class="landing-page">
    <div class="landing-content">
      <div class="logo-section">
        <div class="logo">
          <Icon name="mdi:wave" size="48" />
        </div>
        <h1>Blue</h1>
        <p class="tagline">Your all-in-one life improvement platform</p>
      </div>

      <div class="domain-cards" v-if="auth.isAuthenticated">
        <div class="domain-card finance" @click="navigateToFinance">
          <div class="card-icon">
            <Icon name="mdi:finance" size="32" />
          </div>
          <h2>Finance</h2>
          <p>Track accounts, budgets, transactions, and net worth</p>
        </div>

        <div class="domain-card health" @click="navigateToHealth">
          <div class="card-icon">
            <Icon name="mdi:heart-pulse" size="32" />
          </div>
          <h2>Health</h2>
          <p>Monitor weight, log meals, and get AI-powered plans</p>
        </div>
      </div>

      <div class="auth-section" v-else>
        <p>Sign in to access your dashboard</p>
        <div class="auth-buttons">
          <NuxtLink to="/login" class="btn btn-primary">Sign In</NuxtLink>
          <NuxtLink to="/register" class="btn btn-secondary">Create Account</NuxtLink>
        </div>
      </div>

      <div class="footer">
        <p>Track your progress. Improve your life.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: var(--color-bg-page);
}

.landing-content {
  max-width: 800px;
  width: 100%;
  text-align: center;
}

.logo-section {
  margin-bottom: 48px;
}

.logo {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: var(--color-accent);
  color: var(--color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.logo-section h1 {
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.tagline {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
}

.domain-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

.domain-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 32px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.domain-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-4px);
}

.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.domain-card.finance .card-icon {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.domain-card.health .card-icon {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.domain-card h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.domain-card p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.auth-section {
  margin-bottom: 48px;
}

.auth-section p {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.auth-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn {
  display: inline-block;
  padding: 12px 32px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.btn-primary:hover {
  background: var(--color-accent-dark);
}

.btn-secondary {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  border-color: var(--color-accent);
}

.footer {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

@media (max-width: 600px) {
  .domain-cards {
    grid-template-columns: 1fr;
  }

  .logo-section h1 {
    font-size: 2rem;
  }
}
</style>
