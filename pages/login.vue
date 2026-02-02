<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const username = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);
const isGuestLoading = ref(false);
const devMode = ref(false);
const guestAvailable = ref(false);
const hasUsers = ref(true);

// Check dev mode status on mount
onMounted(async () => {
  try {
    const response = await fetch('/api/auth/setup');
    const data = await response.json();
    
    if (response.ok) {
      devMode.value = data.devMode;
      guestAvailable.value = data.guestAvailable;
      hasUsers.value = data.hasUsers;
      
      // If guest was auto-created and logged in, redirect to home
      if (data.guestCreated) {
        router.push('/');
      }
    }
  } catch (err) {
    console.error('Failed to check auth setup:', err);
  }
});

const handleLogin = async () => {
  error.value = '';
  isLoading.value = true;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Redirect to home page on success
      router.push('/');
    } else {
      error.value = data.statusMessage || 'Login failed';
    }
  } catch (err) {
    error.value = 'Network error. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const handleGuestLogin = async () => {
  error.value = '';
  isGuestLoading.value = true;

  try {
    const response = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      // Redirect to home page on success
      router.push('/');
    } else {
      error.value = data.statusMessage || 'Guest login failed';
    }
  } catch (err) {
    error.value = 'Network error. Please try again.';
  } finally {
    isGuestLoading.value = false;
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
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Enter your password"
            :disabled="isLoading"
          />
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

      <!-- Dev Mode Guest Login -->
      <div v-if="devMode" class="guest-section">
        <div class="divider">
          <span>or</span>
        </div>
        <button
          @click="handleGuestLogin"
          class="guest-btn"
          :disabled="isGuestLoading"
        >
          {{ isGuestLoading ? 'Logging in...' : 'Continue as Guest' }}
        </button>
        <p class="guest-note">Development mode - quick access without account</p>
      </div>

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
  background: #000000;
}

.login-box {
  background: #151515;
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

h1 {
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 8px 0;
  font-size: 1.75rem;
  text-align: center;
}

.subtitle {
  color: rgba(255, 255, 255, 0.7);
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
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  font-weight: 500;
}

input {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #0a0a0a;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #3EB489;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
}

.login-btn {
  background: #3EB489;
  color: #000000;
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
  box-shadow: 0 4px 12px rgba(62, 180, 137, 0.3);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

.register-link a {
  color: #3EB489;
  text-decoration: none;
  margin-left: 4px;
}

.register-link a:hover {
  text-decoration: underline;
}

/* Guest Login Styles */
.guest-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.divider span {
  padding: 0 12px;
}

.guest-btn {
  background: #151515;
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 14px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.guest-btn:hover:not(:disabled) {
  background: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.2);
}

.guest-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.guest-note {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  margin: 0;
}
</style>
