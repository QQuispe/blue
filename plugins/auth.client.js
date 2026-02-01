import { useAuth } from '~/composables/useAuth.js';

export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run on client-side
  if (process.client) {
    const { fetchUser } = useAuth();
    
    // Fetch user on app initialization
    await fetchUser();
  }
});
