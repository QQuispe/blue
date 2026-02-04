import { useAuth } from '~/composables/useAuth';

export default defineNuxtPlugin(() => {
  if (process.client) {
    const route = useRoute();
    if (['/login', '/register'].includes(route.path)) return;

    const { fetchUser, user } = useAuth();
    if (!user.value) fetchUser();
  }
});
