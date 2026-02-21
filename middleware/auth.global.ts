import { defineNuxtRouteMiddleware, navigateTo } from '#app'

const PUBLIC_PAGES = ['/login', '/register']

const CACHE_DURATION = import.meta.dev ? 60 * 1000 : 5 * 60 * 1000 // 1min dev, 5min prod

let lastVerified = 0
let cachedUser: any = null

/**
 * Global Authentication Middleware
 *
 * This middleware runs on EVERY route by default.
 * New pages are automatically protected unless explicitly whitelisted.
 *
 * To make a page public, add it to the publicPages array below.
 */
export default defineNuxtRouteMiddleware(async to => {
  // Check if current route is public
  if (PUBLIC_PAGES.includes(to.path)) {
    return // Allow access
  }

  const now = Date.now()
  const auth = useAuth()

  // Use cached result if within cache duration
  if (cachedUser && now - lastVerified < CACHE_DURATION) {
    auth.user.value = cachedUser
    return
  }

  // Verify with the server
  try {
    const response = await $fetch('/api/auth/me', {
      credentials: 'include',
      ignoreResponseError: true,
    })

    if (!response?.user) {
      cachedUser = null
      lastVerified = 0
      auth.user.value = null
      return navigateTo('/login')
    }

    // Update cache
    cachedUser = response.user
    lastVerified = now
    auth.user.value = response.user
  } catch {
    cachedUser = null
    lastVerified = 0
    auth.user.value = null
    return navigateTo('/login')
  }
})
