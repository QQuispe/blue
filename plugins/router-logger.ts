// Router navigation logging plugin
// Logs all navigation events with detailed information

import { getLogger } from '~/utils/logger'

export default defineNuxtPlugin((nuxtApp) => {
  const logger = getLogger()
  const router = nuxtApp.$router
  
  let navigationStartTime = 0
  
  // Log before navigation starts
  router.beforeEach((to, from) => {
    // Skip redundant navigations
    if (from.path === to.path) return
    
    navigationStartTime = Date.now()
    logger.navigation(from.path, to.path)
  })
  
  // Log after navigation completes
  router.afterEach((to, from) => {
    // Skip redundant navigations
    if (from.path === to.path) return
    
    const duration = Date.now() - navigationStartTime
    logger.success(`✓ ${to.path} (${duration}ms)`)
  })
  
  // Log navigation errors
  router.onError((error, to, from) => {
    logger.error(`Navigation failed: ${from?.path} → ${to?.path}`, {
      error: error.message
    })
  })
  
  // Log initial page load (client-side only)
  if (process.client) {
    logger.info('App ready', { path: router.currentRoute.value.path })
  }
})
