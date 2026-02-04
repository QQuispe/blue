<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const success = ref('');
const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const handleRegister = async () => {
  error.value = '';
  success.value = '';

  // Validation
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters';
    return;
  }

  isLoading.value = true;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.value,
        email: email.value || null,
        password: password.value
      })
    });

    const data = await response.json();

    if (response.ok) {
      success.value = 'Account created successfully! Redirecting to login...';
      // Wait a moment then redirect
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      error.value = data.statusMessage || 'Registration failed';
    }
  } catch (err) {
    error.value = 'Network error. Please try again.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="register-container">
    <div class="register-box">
      <h1>Create Account</h1>
      <p class="subtitle">Join Blue Finance</p>

      <form @submit.prevent="handleRegister" class="register-form">
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
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
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
              <svg v-if="!showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
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
          class="register-btn"
          :disabled="isLoading || !username || !password || !confirmPassword"
        >
          {{ isLoading ? 'Creating Account...' : 'Create Account' }}
        </button>
      </form>

      <div class="login-link">
        Already have an account?
        <NuxtLink to="/login">Sign in</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--color-bg-primary);
}

.register-box {
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  border: 1px solid var(--color-border);
}

h1 {
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
  font-size: 1.75rem;
  text-align: center;
}

.subtitle {
  color: var(--color-text-secondary);
  text-align: center;
  margin: 0 0 32px 0;
  font-size: 0.875rem;
}

.register-form {
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
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
}

.password-input {
  position: relative;
  display: flex;
}

input {
  flex: 1;
  padding: 12px 16px;
  padding-right: 48px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 1rem;
  transition: border-color 0.2s;
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

.help-text {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.error-message {
  background: var(--color-error-bg);
  color: var(--color-error);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
}

.success-message {
  background: var(--color-success-bg);
  color: var(--color-success);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
}

.register-btn {
  background: var(--color-accent);
  color: var(--color-bg-primary);
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.register-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.register-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-link {
  text-align: center;
  margin-top: 24px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.login-link a {
  color: var(--color-accent);
  text-decoration: none;
  margin-left: 4px;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
