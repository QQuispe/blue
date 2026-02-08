// Router navigation logging plugin
// Logs all navigation events with detailed information

import { getLogger } from '~/utils/logger'

export default defineNuxtPlugin((nuxtApp) => {
  const logger = getLogger()
  const router = nuxtApp.$router
  
  // Log before navigation starts
  router.beforeEach((to, from) => {
    logger.navigation(from.path, to.path, {
      fromName: from.name ?? undefined,
      toName: to.name ?? undefined,
      fromParams: from.params,
      toParams: to.params,
      fromQuery: from.query,
      toQuery: to.query,
      timestamp: new Date().toISOString()
    })
  })
  
  // Log after navigation completes
  router.afterEach((to, from) => {
    logger.info('Navigation completed', {
      from: from.path,
      to: to.path,
      duration: Date.now(), // We could track this properly with beforeEach
      timestamp: new Date().toISOString()
    })
  })
  
  // Log navigation errors
  router.onError((error, to, from) => {
    logger.error('Navigation error', {
      error: error.message,
      stack: error.stack ?? undefined,
      from: from?.path,
      to: to?.path,
      timestamp: new Date().toISOString()
    })
  })
  
  // Log initial page load (client-side only)
  if (process.client) {
    logger.info('Application initialized', {
      initialPath: router.currentRoute.value.path,
      userAgent: navigator?.userAgent || 'unknown',
      timestamp: new Date().toISOString()
    })
  }
})