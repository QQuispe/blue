// Client-side logging utility
// Provides structured logging with timestamps, log levels, and user action tracking

const LOG_LEVELS = {
  DEBUG: { level: 0, color: '#6b7280', prefix: 'DEBUG' },
  INFO: { level: 1, color: '#3b82f6', prefix: 'INFO' },
  WARN: { level: 2, color: '#f59e0b', prefix: 'WARN' },
  ERROR: { level: 3, color: '#ef4444', prefix: 'ERROR' }
}

class Logger {
  constructor() {
    this.minLevel = process.env.NODE_ENV === 'development' ? 0 : 1
    this.sessionId = this.generateSessionId()
    this.logs = []
    this.maxLogs = 1000 // Keep last 1000 logs in memory
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  formatTimestamp() {
    const now = new Date()
    return now.toISOString()
  }

  createLogEntry(level, message, data = null, context = {}) {
    // Only access window/navigator on client side
    const clientContext = typeof window !== 'undefined' ? {
      url: window.location?.href,
      path: window.location?.pathname,
      userAgent: navigator?.userAgent
    } : {
      url: 'server',
      path: 'server',
      userAgent: 'server'
    }

    const logEntry = {
      timestamp: this.formatTimestamp(),
      sessionId: this.sessionId,
      level: level.prefix,
      levelValue: level.level,
      message,
      data,
      context: {
        ...clientContext,
        ...context
      }
    }

    // Store in memory (client only)
    if (typeof window !== 'undefined') {
      this.logs.push(logEntry)
      if (this.logs.length > this.maxLogs) {
        this.logs.shift()
      }
    }

    return logEntry
  }

  log(level, message, data = null, context = {}) {
    if (level.level < this.minLevel) return

    const entry = this.createLogEntry(level, message, data, context)

    // Console output with styling
    const styles = `
      background: ${level.color};
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 11px;
    `
    const timestampStyles = `
      color: #6b7280;
      font-size: 11px;
    `

    console.log(
      `%c${entry.timestamp}%c %c${level.prefix}%c ${message}`,
      timestampStyles,
      '',
      styles,
      '',
      data || ''
    )

    // If error, also log to console.error
    if (level.level >= LOG_LEVELS.ERROR.level) {
      console.error(`[${level.prefix}] ${message}`, data || '')
    }

    return entry
  }

  debug(message, data, context) {
    return this.log(LOG_LEVELS.DEBUG, message, data, context)
  }

  info(message, data, context) {
    return this.log(LOG_LEVELS.INFO, message, data, context)
  }

  warn(message, data, context) {
    return this.log(LOG_LEVELS.WARN, message, data, context)
  }

  error(message, data, context) {
    return this.log(LOG_LEVELS.ERROR, message, data, context)
  }

  // User action logging
  action(action, details = {}) {
    return this.info(`USER_ACTION: ${action}`, {
      action,
      timestamp: Date.now(),
      ...details
    }, {
      type: 'user_action'
    })
  }

  // Navigation logging
  navigation(from, to, details = {}) {
    return this.info('NAVIGATION', {
      from,
      to,
      timestamp: Date.now(),
      ...details
    }, {
      type: 'navigation'
    })
  }

  // API call logging
  api(method, endpoint, status, duration, data = null) {
    const level = status >= 400 ? LOG_LEVELS.ERROR : status >= 300 ? LOG_LEVELS.WARN : LOG_LEVELS.INFO
    return this.log(level, `API ${method} ${endpoint} - ${status} (${duration}ms)`, {
      method,
      endpoint,
      status,
      duration,
      data
    }, {
      type: 'api_call'
    })
  }

  // Component lifecycle logging
  component(componentName, lifecycle, data = null) {
    return this.debug(`COMPONENT: ${componentName} - ${lifecycle}`, data, {
      type: 'component_lifecycle',
      component: componentName
    })
  }

  // Get all logs for debugging
  getLogs(filter = {}) {
    let filtered = this.logs

    if (filter.level) {
      filtered = filtered.filter(log => log.level === filter.level)
    }

    if (filter.type) {
      filtered = filtered.filter(log => log.context?.type === filter.type)
    }

    if (filter.since) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= filter.since)
    }

    return filtered
  }

  // Export logs as JSON for debugging
  exportLogs() {
    return JSON.stringify(this.logs, null, 2)
  }

  // Clear logs
  clear() {
    this.logs = []
    this.info('Log buffer cleared')
  }
}

// Create singleton instance
const logger = new Logger()

// Vue composable for easy use in components
export function useLogger() {
  return logger
}

// Export for direct use
export { logger }
export default logger

// Add global error handler (client-side only)
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('error', (event) => {
    logger.error('UNCAUGHT_ERROR', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('UNHANDLED_PROMISE_REJECTION', {
      reason: event.reason?.message || event.reason,
      stack: event.reason?.stack
    })
  })
}
