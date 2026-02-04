interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: Record<string, unknown>;
}

class Logger {
  private minLevel: number;
  private sessionId: string;
  private logs: LogEntry[];
  private maxLogs: number;

  constructor() {
    this.minLevel = process.env.NODE_ENV === 'development' ? 0 : 1;
    this.sessionId = Math.random().toString(36).substring(2, 11);
    this.logs = [];
    this.maxLogs = 1000;
  }

  private log(level: string, color: string, message: string, data?: Record<string, unknown>): void {
    if (this.minLevel > 0 && level === 'DEBUG') return;

    const entry: LogEntry = { timestamp: new Date().toISOString(), level, message, data };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    console.log(`%c[${entry.timestamp}] ${level}: ${message}`, `color: ${color}`, data ? JSON.stringify(data) : '');
  }

  debug(message: string, data?: Record<string, unknown>): void { this.log('DEBUG', '#6b7280', message, data); }
  info(message: string, data?: Record<string, unknown>): void { this.log('INFO', '#3b82f6', message, data); }
  success(message: string, data?: Record<string, unknown>): void { this.log('SUCCESS', '#10b981', message, data); }
  warn(message: string, data?: Record<string, unknown>): void { this.log('WARN', '#f59e0b', message, data); }
  error(message: string, data?: Record<string, unknown>): void { this.log('ERROR', '#ef4444', message, data); }

  component(name: string, action: string, data?: Record<string, unknown>): void { this.debug(`[${name}] ${action}`, data); }
  api(method: string, url: string, status: number, duration: number, userId?: number): void { this.info(`API ${method} ${url}`, { status, duration, userId }); }
  navigation(from: string, to: string, duration?: number): void { this.info('NAVIGATION', { from, to, duration }); }

  getRecentLogs(count: number = 50): LogEntry[] { return this.logs.slice(-count); }
  clearLogs(): void { this.logs = []; }
}

export const logger = new Logger();
export type { LogEntry };
