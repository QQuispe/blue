import { defineEventHandler, getRequestURL, getMethod } from 'h3';

const LOG_COLORS = {
  RESET: '\x1b[0m', BRIGHT: '\x1b[1m', DIM: '\x1b[2m',
  BLACK: '\x1b[30m', RED: '\x1b[31m', GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m', BLUE: '\x1b[34m', CYAN: '\x1b[36m', WHITE: '\x1b[37m'
};

class ServerLogger {
  private minLevel: number;

  constructor() {
    this.minLevel = process.env.NODE_ENV === 'development' ? 0 : 1;
  }

  private log(level: string, color: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] %c${level.padEnd(7)}${LOG_COLORS.RESET} ${message}`, `color: ${color}`);
  }

  debug(message: string): void { if (this.minLevel <= 0) this.log('DEBUG', LOG_COLORS.DIM, message); }
  info(message: string): void { this.log('INFO', LOG_COLORS.BLUE, message); }
  success(message: string): void { this.log('SUCCESS', LOG_COLORS.GREEN, message); }
  warn(message: string): void { this.log('WARN', LOG_COLORS.YELLOW, message); }
  error(message: string): void { this.log('ERROR', LOG_COLORS.RED, message); }
  db(query: string, duration: number, count: number): void { this.debug(`DB ${duration}ms (${count} rows)`); }

  api(method: string, path: string, statusCode: number, duration: number, userId?: number): void {
    const color = statusCode >= 500 ? LOG_COLORS.RED : statusCode >= 400 ? LOG_COLORS.YELLOW : statusCode >= 300 ? LOG_COLORS.CYAN : LOG_COLORS.GREEN;
    const user = userId ? ` [User: ${userId}]` : '';
    this.log('API', color, `${method.padEnd(6)} ${path.padEnd(40)} ${statusCode} (${duration}ms)${user}`);
  }

  navigation(from: string, to: string): void {
    this.log('NAV', LOG_COLORS.CYAN, `${from} → ${to}`);
  }
}

const serverLogger = new ServerLogger();

export const requestLogger = defineEventHandler(async (event) => {
  const start = Date.now();
  const url = getRequestURL(event);
  const method = getMethod(event);

  try {
    const result = await event.handler(event);
    const duration = Date.now() - start;
    serverLogger.api(method, url.pathname, event.node.res.statusCode || 200, duration);
    return result;
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const err = error as { statusCode?: number; message: string; stack?: string };
    serverLogger.api(method, url.pathname, err.statusCode || 500, duration);
    serverLogger.error(`Request failed: ${err.message}`, { stack: err.stack });
    throw error;
  }
});

export { serverLogger };
export default serverLogger;
