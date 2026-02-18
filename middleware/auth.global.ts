import { defineNuxtRouteMiddleware, navigateTo } from '#app';

/**
 * Global Authentication Middleware
 * 
 * This middleware runs on EVERY route by default.
 * New pages are automatically protected unless explicitly whitelisted.
 * 
 * To make a page public, add it to the publicPages array below.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Whitelist of public pages that don't require authentication
  const publicPages = [
    '/login',
    '/register',
    // Add more public pages here as needed
  ];
  
  // Check if current route is public
  if (publicPages.includes(to.path)) {
    return; // Allow access
  }
  
  // Check if user is authenticated
  const auth = useAuth();
  
  // If we already have user data client-side, we're good
  if (auth.user.value) return;
  
  // Otherwise check with the server
  try {
    const response = await $fetch('/api/auth/me', { 
      credentials: 'include',
      // Don't throw on 401, just check if user exists
      ignoreResponseError: true 
    });
    
    // If no user or error, redirect to login
    if (!response?.user) {
      return navigateTo('/login');
    }
  } catch {
    // Any error means not authenticated
    return navigateTo('/login');
  }
});
