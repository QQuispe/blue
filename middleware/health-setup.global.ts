import { defineNuxtRouteMiddleware } from '#app'

const HEALTH_PUBLIC_PAGES = ['/health/setup']

const CACHE_DURATION = 60 * 1000 // 1 minute

let lastVerified = 0
let setupComplete = false

export default defineNuxtRouteMiddleware(async to => {
  // Allow access to setup page
  if (HEALTH_PUBLIC_PAGES.includes(to.path)) {
    return
  }

  // Only run on health routes
  if (!to.path.startsWith('/health')) {
    return
  }

  // Check if setup is complete - but don't redirect, let the page handle it
  // This allows pages to show their own "Setup Required" UI
  const now = Date.now()

  // Use cached result if within cache duration
  if (now - lastVerified < CACHE_DURATION) {
    return
  }

  try {
    const response = await $fetch('/api/health/setup-status', {
      credentials: 'include',
      ignoreResponseError: true,
    })

    setupComplete = response?.isComplete ?? false
    lastVerified = now
  } catch {
    setupComplete = false
    lastVerified = 0
  }
})
