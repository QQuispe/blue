export interface SessionConfig {
  inactivityTimeout: number
  maxSession: number
}

export const getSessionConfig = (): SessionConfig => {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    return {
      inactivityTimeout: parseInt(process.env.SESSION_TIMEOUT_DEV || '0'),
      maxSession: parseInt(process.env.MAX_SESSION_DEV || String(7 * 24 * 60 * 60 * 1000)),
    }
  }

  return {
    inactivityTimeout: parseInt(process.env.SESSION_TIMEOUT_PROD || String(20 * 60 * 1000)),
    maxSession: parseInt(process.env.MAX_SESSION_PROD || String(24 * 60 * 60 * 1000)),
  }
}
