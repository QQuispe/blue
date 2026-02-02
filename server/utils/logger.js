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

class ServerLogger {
  constructor() {
    this.minLevel = process.env.NODE_ENV === 'development' ? 0 : 1;
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatLevel(level, color) {
    const padded = level.padEnd(5);
    return `${color}${LOG_COLORS.BRIGHT}${padded}${LOG_COLORS.RESET}`;
  }

  log(level, color, message, data = null) {
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

  debug(message, data) {
    if (this.minLevel <= 0) {
      this.log('DEBUG', LOG_COLORS.DIM, message, data);
    }
  }

  info(message, data) {
    this.log('INFO', LOG_COLORS.BLUE, message, data);
  }

  success(message, data) {
    this.log('SUCCESS', LOG_COLORS.GREEN, message, data);
  }

  warn(message, data) {
    this.log('WARN', LOG_COLORS.YELLOW, message, data);
  }

  error(message, data) {
    this.log('ERROR', LOG_COLORS.RED, message, data);
  }

  api(method, path, statusCode, duration, userId = null) {
    const color = statusCode >= 500 ? LOG_COLORS.RED : 
                  statusCode >= 400 ? LOG_COLORS.YELLOW :
                  statusCode >= 300 ? LOG_COLORS.CYAN :
                  LOG_COLORS.GREEN;
    
    const status = `${color}${statusCode}${LOG_COLORS.RESET}`;
    const user = userId ? ` [User: ${userId}]` : '';
    
    this.info(`API ${method.padEnd(6)} ${path.padEnd(40)} ${status} (${duration}ms)${user}`);
  }

  navigation(from, to, userId = null) {
    const user = userId ? ` [User: ${userId}]` : '';
    this.info(`NAVIGATION ${from} → ${to}${user}`);
  }

  action(userId, action, details = {}) {
    this.info(`USER_ACTION [${userId}] ${action}`, details);
  }

  db(query, duration, rows = null) {
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
  } catch (error) {
    const duration = Date.now() - start;
    const statusCode = error.statusCode || 500;
    
    // Log error
    serverLogger.api(method, url.pathname, statusCode, duration);
    serverLogger.error(`Request failed: ${error.message}`, {
      stack: error.stack,
      statusCode
    });
    
    throw error;
  }
});

// Export for use in API routes
export { serverLogger };
export default serverLogger;
