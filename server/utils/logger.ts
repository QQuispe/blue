import { defineEventHandler, getRequestURL, getMethod, createError } from 'h3'

const LOG_COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

class ServerLogger {
  private minLevel: number
  private levelMap: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
  }

  constructor() {
    const envLevel = (process.env.LOG_LEVEL?.toLowerCase() ||
      (process.env.NODE_ENV === 'development' ? 'debug' : 'info')) as LogLevel
    this.minLevel = this.levelMap[envLevel] ?? 1
  }

  private log(level: string, levelNum: number, color: string, message: string): void {
    if (levelNum < this.minLevel) return
    const timestamp = new Date().toISOString()
    console.log(
      `[${timestamp}] %c${level.padEnd(7)}${LOG_COLORS.RESET} ${message}`,
      `color: ${color}`
    )
  }

  debug(message: string): void {
    this.log('DEBUG', 0, LOG_COLORS.DIM, message)
  }
  info(message: string): void {
    this.log('INFO', 1, LOG_COLORS.BLUE, message)
  }
  success(message: string): void {
    this.log('SUCCESS', 1, LOG_COLORS.GREEN, message)
  }
  warn(message: string): void {
    this.log('WARN', 2, LOG_COLORS.YELLOW, message)
  }
  error(message: string): void {
    this.log('ERROR', 3, LOG_COLORS.RED, message)
  }
  db(query: string, duration: number, count: number): void {
    this.debug(`DB ${duration}ms (${count} rows)`)
  }

  api(method: string, path: string, statusCode: number, duration: number, userId?: number): void {
    const color =
      statusCode >= 500
        ? LOG_COLORS.RED
        : statusCode >= 400
          ? LOG_COLORS.YELLOW
          : statusCode >= 300
            ? LOG_COLORS.CYAN
            : LOG_COLORS.GREEN
    const user = userId ? ` [User: ${userId}]` : ''
    this.log(
      'API',
      1,
      color,
      `${method.padEnd(6)} ${path.padEnd(40)} ${statusCode} (${duration}ms)${user}`
    )
  }

  navigation(from: string, to: string): void {
    this.log('NAV', 1, LOG_COLORS.CYAN, `${from} → ${to}`)
  }
}

const serverLogger = new ServerLogger()

// Note: requestLogger middleware - currently disabled due to H3 API changes
// Can be re-enabled if needed with proper h3 event handling
export const requestLogger = defineEventHandler(async event => {
  // This is a placeholder - actual request logging handled elsewhere
  // The original implementation used event.handle() which no longer exists in h3
  throw createError({
    statusCode: 404,
    statusMessage: 'Not implemented',
  })
})

export { serverLogger }
export default serverLogger
