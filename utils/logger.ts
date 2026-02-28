interface LogEntry {
  timestamp: string
  level: string
  message: string
  data?: Record<string, unknown>
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

class Logger {
  private minLevel: number
  private sessionId: string
  private logs: LogEntry[]
  private maxLogs: number
  private levelMap: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
  }

  constructor(logLevel: string = 'info') {
    const envLevel = logLevel.toLowerCase() as LogLevel
    this.minLevel = this.levelMap[envLevel] ?? 1
    this.sessionId = Math.random().toString(36).substring(2, 11)
    this.logs = []
    this.maxLogs = 1000
  }

  private log(
    level: string,
    levelNum: number,
    color: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (levelNum < this.minLevel) return

    const entry: LogEntry = { timestamp: new Date().toISOString(), level, message, data }
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) this.logs.shift()

    console.log(
      `%c[${entry.timestamp}] ${level}: ${message}`,
      `color: ${color}`,
      data ? JSON.stringify(data) : ''
    )
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('DEBUG', 0, '#6b7280', message, data)
  }
  info(message: string, data?: Record<string, unknown>): void {
    this.log('INFO', 1, '#3b82f6', message, data)
  }
  success(message: string, data?: Record<string, unknown>): void {
    this.log('SUCCESS', 1, '#10b981', message, data)
  }
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('WARN', 2, '#f59e0b', message, data)
  }
  error(message: string, data?: Record<string, unknown>): void {
    this.log('ERROR', 3, '#ef4444', message, data)
  }

  action(action: string, data?: Record<string, unknown>): void {
    this.log('ACTION', 1, '#8b5cf6', action, data)
  }
  component(name: string, action: string, data?: Record<string, unknown>): void {
    this.debug(`[${name}] ${action}`, data)
  }
  api(method: string, url: string, status: number, duration: number, userId?: number): void {
    this.info(`API ${method} ${url}`, { status, duration, userId })
  }
  navigation(from: string, to: string): void {
    // Skip redundant navigations (e.g., login -> login)
    if (from === to) return

    this.info(`→ ${to}`)
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count)
  }
  clearLogs(): void {
    this.logs = []
  }
}

// This will be initialized by the plugin
let loggerInstance: Logger | null = null

export function createLogger(logLevel: string): Logger {
  loggerInstance = new Logger(logLevel)
  return loggerInstance
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    // Check for LOG_LEVEL in environment (works during SSR)
    const envLogLevel = typeof process !== 'undefined' ? process.env.LOG_LEVEL : undefined
    loggerInstance = new Logger(envLogLevel || 'info')
  }
  return loggerInstance
}

export type { LogEntry }
