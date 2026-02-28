<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const isLoading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const handleRegister = async () => {
  error.value = ''
  success.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  isLoading.value = true

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        email: email.value || null,
        password: password.value,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      success.value = 'Account created successfully! Redirecting...'
      setTimeout(() => router.push('/login'), 2000)
    } else {
      error.value = data.statusMessage || 'Registration failed'
    }
  } catch (err) {
    error.value = 'Network error. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <NuxtLink to="/login" class="back-link" title="Back to login">
        <Icon name="mdi:arrow-left" size="20" />
      </NuxtLink>

      <h1>Create Account</h1>
      <p class="subtitle">Join Blue Finance</p>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label for="username">Username *</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            placeholder="Choose a username"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="email">Email (optional)</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="your@email.com"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="password">Password *</label>
          <div class="password-input">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="At least 8 characters"
              :disabled="isLoading"
            />
            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
              :title="showPassword ? 'Hide password' : 'Show password'"
            >
              <Icon :name="showPassword ? 'mdi:eye-off' : 'mdi:eye'" size="20" />
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password *</label>
          <div class="password-input">
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              required
              placeholder="Re-enter password"
              :disabled="isLoading"
            />
            <button
              type="button"
              class="password-toggle"
              @click="showConfirmPassword = !showConfirmPassword"
              :title="showConfirmPassword ? 'Hide password' : 'Show password'"
            >
              <Icon :name="showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'" size="20" />
            </button>
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="success" class="success-message">
          {{ success }}
        </div>

        <button
          type="submit"
          class="auth-btn"
          :disabled="isLoading || !username || !password || !confirmPassword"
        >
          {{ isLoading ? 'Creating Account...' : 'Create Account' }}
        </button>
      </form>

      <div class="auth-footer">
        Already have an account?
        <NuxtLink to="/login">Sign in</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style>
/* Layout - Full screen centered (global for SSR compatibility) */
.auth-page {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--color-bg-primary, #0d0d0d);
}

/* Card - Fixed sizing to prevent layout shift during load */
.auth-card {
  /* Fixed constraints that work before CSS loads */
  width: 100%;
  max-width: 400px;
  min-width: 320px;

  /* Visual styling */
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: clamp(24px, 5vw, 40px);
  box-sizing: border-box;
  position: relative;
}

/* Back link */
.back-link {
  position: absolute;
  top: 16px;
  left: 16px;
  color: var(--color-text-muted);
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-link:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
}

/* Header */
h1 {
  margin: 8px 0 8px 0;
  font-size: 1.75rem;
  text-align: center;
  color: var(--color-text-primary);
}

.subtitle {
  margin: 0 0 32px 0;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

input {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 1rem;
  transition: border-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: var(--color-accent);
}

input::placeholder {
  color: var(--color-text-muted);
}

input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Password toggle */
.password-input {
  position: relative;
}

.password-input input {
  padding-right: 48px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: var(--color-text-primary);
}

/* Messages */
.error-message {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
}

.success-message {
  background: rgba(62, 180, 137, 0.1);
  color: var(--color-accent);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
}

/* Submit button */
.auth-btn {
  background: var(--color-accent);
  color: var(--color-bg-primary);
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(62, 180, 137, 0.3);
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Footer */
.auth-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.auth-footer a {
  color: var(--color-accent);
  text-decoration: none;
  margin-left: 4px;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
