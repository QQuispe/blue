import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuth } from '~/composables/auth/useAuth'

const PUBLIC_PAGES = ['/login', '/register']

const CACHE_DURATION = import.meta.dev ? 60 * 1000 : 5 * 60 * 1000 // 1min dev, 5min prod
const MAX_RETRIES = 3
const RETRY_DELAY = 500 // ms

let lastVerified = 0
let cachedUser: any = null

/**
 * Global Authentication Middleware
 *
 * This middleware runs on EVERY route by default.
 * New pages are automatically protected unless explicitly whitelisted.
 *
 * To make a page public, add it to the PUBLIC_PAGES array below.
 */
export default defineNuxtRouteMiddleware(async to => {
  // Skip static assets and internal paths - these should never trigger auth checks
  if (
    to.path.startsWith('/_nuxt/') ||
    to.path.startsWith('/api/') ||
    to.path === '/favicon.ico' ||
    to.path === '/robots.txt'
  ) {
    return
  }

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

  // Verify with the server - with retry logic
  let lastError: any = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response: any = await $fetch('/api/auth/me', {
        credentials: 'include',
        ignoreResponseError: true,
      })

      // Check for valid response - must have statusCode 200 and user
      if (response?.statusCode === 200 && response?.user) {
        // Success - update cache and user
        cachedUser = response.user
        lastVerified = now
        auth.user.value = response.user

        if (attempt > 1) {
          console.log(`[Auth] Session verified after ${attempt} attempts`)
        }
        return
      }

      // If we get here, response exists but doesn't have valid user
      // This is a legitimate 401 - don't retry
      if (response?.statusCode === 401 || !response?.user) {
        console.log('[Auth] Not authenticated, redirecting to login')
        cachedUser = null
        lastVerified = 0
        auth.user.value = null
        return navigateTo('/login')
      }

      // Unexpected response format - might be transient, retry
      console.warn(`[Auth] Unexpected response format (attempt ${attempt}):`, response)
      lastError = new Error(`Unexpected response: ${JSON.stringify(response)}`)
    } catch (error: any) {
      console.warn(`[Auth] Fetch error (attempt ${attempt}):`, error.message)
      lastError = error

      // Wait before retrying
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
      }
    }
  }

  // All retries failed
  console.error('[Auth] All auth verification attempts failed:', lastError?.message)

  // Don't redirect on network errors - allow page to load
  // The page can handle auth state separately
  // Only redirect if we definitively know user is not authenticated
  if (lastError?.message?.includes('401') || lastError?.statusCode === 401) {
    cachedUser = null
    lastVerified = 0
    auth.user.value = null
    return navigateTo('/login')
  }

  // For network errors, allow access but with no user
  // This prevents the logout loop while still protecting private pages
  console.warn('[Auth] Network error - allowing access but user is null')
  auth.user.value = null
})
