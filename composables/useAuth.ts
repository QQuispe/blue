// Composable for managing auth state with TypeScript

// Define interfaces for types
interface User {
  id: number;
  username: string;
  email?: string;
  isAdmin: boolean;
}

interface LoginResponse {
  statusCode: number;
  message: string;
  user?: User;
}

interface MeResponse {
  statusCode?: number;
  message?: string;
  user?: User | null;
}

export const useAuth = () => {
  // Use a single shared state that's consistent across all components
  const user = useState<User | null>('user', () => null);
  const isLoading = useState<boolean>('authLoading', () => false);

  // Fetch current user
  const fetchUser = async (): Promise<void> => {
    isLoading.value = true;
    try {
      const response = await $fetch<MeResponse>('/api/auth/me', {
        credentials: 'include'
      });
      
      user.value = response.user || null;
    } catch (error) {
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  // Auto-fetch user when composable is first used on client side
  if (import.meta.client && !user.value) {
    fetchUser();
  }

  // Force refresh user state (useful after login)
  const refreshUser = async (): Promise<void> => {
    await fetchUser();
  };

  // Login function
  const login = async (username: string, password: string): Promise<LoginResponse> => {
    const response = await $fetch<LoginResponse>('/api/auth/login', {
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
  const logout = async (): Promise<void> => {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('[useAuth] Logout API error:', error);
    }
    user.value = null;
    await navigateTo('/login');
  };

  // Check if authenticated
  const isAuthenticated = computed((): boolean => !!user.value);

  // Check if admin
  const isAdmin = computed((): boolean => user.value?.isAdmin || false);

  return {
    user,
    isLoading: readonly(isLoading),
    isAuthenticated,
    isAdmin,
    fetchUser,
    refreshUser,
    login,
    logout
  };
};