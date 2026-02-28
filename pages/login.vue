<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { login: authLogin } = useAuth()

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)
const showPassword = ref(false)

const handleLogin = async () => {
  error.value = ''
  isLoading.value = true

  try {
    const response = await authLogin(username.value, password.value)
    if (response.statusCode === 200) {
      router.push('/')
    } else {
      error.value = response.message || 'Invalid credentials'
    }
  } catch (err) {
    error.value = 'Unable to connect. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Welcome Back</h1>
      <p class="subtitle">Sign in to your account</p>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            placeholder="Enter your username"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-input">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="Enter your password"
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

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="auth-btn" :disabled="isLoading || !username || !password">
          {{ isLoading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="auth-footer">
        Don't have an account?
        <NuxtLink to="/register">Create one</NuxtLink>
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
}

/* Header */
h1 {
  margin: 0 0 8px 0;
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

/* Error message */
.error-message {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
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
