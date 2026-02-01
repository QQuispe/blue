// Composable for managing auth state
import { useState, useFetch } from '#app';

export const useAuth = () => {
  const user = useState('user', () => null);
  const isLoading = useState('authLoading', () => false);

  // Fetch current user on app initialization
  const fetchUser = async () => {
    isLoading.value = true;
    try {
      const { data } = await useFetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (data.value && data.value.user) {
        user.value = data.value.user;
      } else {
        user.value = null;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  // Login function
  const login = async (username, password) => {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username, password },
      credentials: 'include'
    });

    if (response.user) {
      user.value = response.user;
    }

    return response;
  };

  // Logout function
  const logout = async () => {
    await $fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    user.value = null;
    await navigateTo('/login');
  };

  // Check if authenticated
  const isAuthenticated = computed(() => !!user.value);

  // Check if admin
  const isAdmin = computed(() => user.value?.isAdmin || false);

  return {
    user: readonly(user),
    isLoading: readonly(isLoading),
    isAuthenticated,
    isAdmin,
    fetchUser,
    login,
    logout
  };
};
