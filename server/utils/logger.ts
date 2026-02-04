import { defineEventHandler, getRequestURL, getMethod } from 'h3';

// Server-side logging configuration
const LOG_COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERSCORE: '\x1b[4m',
  
  // Foreground colors
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  
  // Background colors
  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
  BG_WHITE: '\x1b[47m'
};

interface LogData {
  query?: string;
  [key: string]: unknown;
}

interface NavigationData {
  fromName?: string;
  toName?: string;
  fromParams?: Record<string, string>;
  toParams?: Record<string, string>;
  fromQuery?: Record<string, string>;
  toQuery?: Record<string, string>;
  timestamp: string;
}

class ServerLogger {
  private minLevel: number;

  constructor() {
    this.minLevel = process.env.NODE_ENV === 'development' ? 0 : 1;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLevel(level: string, color: string): string {
    const padded = level.padEnd(5);
    return `${color}${LOG_COLORS.BRIGHT}${padded}${LOG_COLORS.RESET}`;
  }

  private log(level: string, color: string, message: string, data: LogData | null = null): void {
    const timestamp = this.getTimestamp();
    const levelStr = this.formatLevel(level, color);
    
    let output = `[${timestamp}] ${levelStr} ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        output += '\n' + JSON.stringify(data, null, 2);
      } else {
        output += ' ' + data;
      }
    }
    
    console.log(output);
  }

  debug(message: string, data?: LogData): void {
    if (this.minLevel <= 0) {
      this.log('DEBUG', LOG_COLORS.DIM, message, data ?? null);
    }
  }

  info(message: string, data?: LogData): void {
    this.log('INFO', LOG_COLORS.BLUE, message, data ?? null);
  }

  success(message: string, data?: LogData): void {
    this.log('SUCCESS', LOG_COLORS.GREEN, message, data ?? null);
  }

  warn(message: string, data?: LogData): void {
    this.log('WARN', LOG_COLORS.YELLOW, message, data ?? null);
  }

  error(message: string, data?: LogData): void {
    this.log('ERROR', LOG_COLORS.RED, message, data ?? null);
  }

  api(method: string, path: string, statusCode: number, duration: number, userId: number | null = null): void {
    const color = statusCode >= 500 ? LOG_COLORS.RED : 
                  statusCode >= 400 ? LOG_COLORS.YELLOW :
                  statusCode >= 300 ? LOG_COLORS.CYAN :
                  LOG_COLORS.GREEN;
    
    const status = `${color}${statusCode}${LOG_COLORS.RESET}`;
    const user = userId ? ` [User: ${userId}]` : '';
    
    this.info(`API ${method.padEnd(6)} ${path.padEnd(40)} ${status} (${duration}ms)${user}`);
  }

  navigation(from: string, to: string, data?: NavigationData): void {
    const user = data?.fromName ? ` [User: ${data.fromName}]` : '';
    this.info(`NAVIGATION ${from} → ${to}${user}`);
  }

  action(userId: number, action: string, details: Record<string, unknown> = {}): void {
    this.info(`USER_ACTION [${userId}] ${action}`, details);
  }

  db(query: string, duration: number, rows: number | null = null): void {
    const rowsInfo = rows !== null ? ` (${rows} rows)` : '';
    this.debug(`DB ${duration}ms${rowsInfo}`, { query: query.substring(0, 100) });
  }
}

// Create singleton
const serverLogger = new ServerLogger();

// Request logging middleware
export const requestLogger = defineEventHandler(async (event) => {
  const start = Date.now();
  const url = getRequestURL(event);
  const method = getMethod(event);
  
  // Log request start
  serverLogger.debug(`→ ${method} ${url.pathname}`);
  
  // Continue with the request
  try {
    const result = await event.handler(event);
    
    // Calculate duration
    const duration = Date.now() - start;
    const statusCode = event.node.res.statusCode || 200;
    
    // Log response
    serverLogger.api(method, url.pathname, statusCode, duration);
    
    return result;
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const errorWithStatus = error as { statusCode?: number; message: string; stack?: string };
    const statusCode = errorWithStatus.statusCode || 500;
    
    // Log error
    serverLogger.api(method, url.pathname, statusCode, duration);
    serverLogger.error(`Request failed: ${errorWithStatus.message}`, {
      stack: errorWithStatus.stack,
      statusCode
    });
    
    throw error;
  }
});

// Export for use in API routes
export { serverLogger };
export default serverLogger;