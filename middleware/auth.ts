import { defineNuxtRouteMiddleware, navigateTo } from '#app';

interface AuthMeResponse {
  statusCode?: number;
  message?: string;
  user?: { id: number; username: string; email?: string; isAdmin: boolean } | null;
}

export default defineNuxtRouteMiddleware(async (to) => {
  const publicPages = ['/login', '/register'];
  if (publicPages.includes(to.path)) return;
  if (process.server) return;

  const auth = useAuth();
  if (auth.user.value) return;

  try {
    const response = await $fetch<AuthMeResponse>('/api/auth/me', { credentials: 'include' });
    if (!response?.user) return navigateTo('/login');
  } catch {
    return navigateTo('/login');
  }
});