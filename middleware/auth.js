import { defineNuxtRouteMiddleware, navigateTo } from '#app';

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip middleware for auth-related pages
  const publicPages = ['/login', '/register'];
  if (publicPages.includes(to.path)) {
    return;
  }

  // Check if user is authenticated by calling the API
  try {
    const response = await $fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.user) {
      // User is not authenticated, redirect to login
      return navigateTo('/login');
    }

    // Store user in app state for later use
    // This can be accessed via useState('user') in components
    const user = useState('user', () => response.user);
    
  } catch (error) {
    // Error fetching auth status, redirect to login
    console.error('Auth middleware error:', error);
    return navigateTo('/login');
  }
});
