import { useAuth } from '~/composables/useAuth';

export default defineNuxtPlugin((_nuxtApp) => {
  // Don't run on auth pages
  if (process.client) {
    const route = useRoute();
    const publicPages = ['/login', '/register'];
    if (publicPages.includes(route.path)) {
      return;
    }
    
    try {
      const { fetchUser, user } = useAuth();
      // Only fetch if we don't have a user yet
      if (!user.value) {
        fetchUser();
      }
    } catch (error) {
      console.error('Auth plugin error:', error);
    }
  }
});