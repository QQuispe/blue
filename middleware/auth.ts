import { defineNuxtRouteMiddleware, navigateTo } from '#app';

// Define types for the response
interface User {
  id: number;
  username: string;
  email?: string;
  isAdmin: boolean;
}

interface AuthMeResponse {
  statusCode?: number;
  message?: string;
  user?: User | null;
}

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Skip middleware for auth-related pages
  const publicPages = ['/login', '/register'];
  if (publicPages.includes(to.path)) {
    return;
  }

  // For SSR, we'll skip the check
  if (process.server) {
    return;
  }

  // Get auth state from composable
  const auth = useAuth();
  
  // If we already have a user, skip the API call
  if (auth.user.value) {
    return;
  }

  // Check if user is authenticated by calling the API
  try {
    const response = await $fetch<AuthMeResponse>('/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response?.user) {
      // User is not authenticated, redirect to login
      return navigateTo('/login');
    }
  } catch (error) {
    // Error fetching auth status, redirect to login
    console.error('Auth middleware error:', error);
    return navigateTo('/login');
  }
});