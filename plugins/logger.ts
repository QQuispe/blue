import { createLogger, getLogger } from '~/utils/logger'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // Initialize logger with runtime config log level
  const logLevel = config.public.logLevel || 'info'
  createLogger(logLevel)

  return {
    provide: {
      logger: getLogger(),
    },
  }
})
