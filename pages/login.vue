<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { login: authLogin } = useAuth();

const username = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);
const showPassword = ref(false);

const handleLogin = async () => {
  error.value = '';
  isLoading.value = true;

  try {
    const response = await authLogin(username.value, password.value);

    if (response.statusCode === 200) {
      router.push('/');
    } else {
      error.value = response.message || 'Login failed';
    }
  } catch (err) {
    error.value = 'Network error. Please try again.';
    console.error('Login error:', err);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h1>Welcome Back</h1>
      <p class="subtitle">Sign in to your account</p>

      <form @submit.prevent="handleLogin" class="login-form">
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

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="login-btn"
          :disabled="isLoading || !username || !password"
        >
          {{ isLoading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="register-link">
        Don't have an account?
        <NuxtLink to="/register">Create one</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--color-bg-primary);
}

.login-box {
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

.login-form {
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

.error-message {
  background: var(--color-error-bg);
  color: var(--color-error);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
}

.login-btn {
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

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  margin-top: 24px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.register-link a {
  color: var(--color-accent);
  text-decoration: none;
  margin-left: 4px;
}

.register-link a:hover {
  text-decoration: underline;
}
</style>
