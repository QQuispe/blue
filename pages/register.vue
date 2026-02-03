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
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="At least 8 characters"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password *</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            placeholder="Re-enter password"
            :disabled="isLoading"
          />
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

input {
  padding: 12px 16px;
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
