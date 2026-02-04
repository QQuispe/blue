// Client-side logging utility
// Provides structured logging with timestamps, log levels, and user action tracking

interface LogLevel {
  level: number;
  color: string;
  prefix: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  sessionId: string;
}

const LOG_LEVELS: Record<string, LogLevel> = {
  DEBUG: { level: 0, color: '#6b7280', prefix: 'DEBUG' },
  INFO: { level: 1, color: '#3b82f6', prefix: 'INFO' },
  SUCCESS: { level: 1, color: '#10b981', prefix: 'SUCCESS' },
  WARN: { level: 2, color: '#f59e0b', prefix: 'WARN' },
  ERROR: { level: 3, color: '#ef4444', prefix: 'ERROR' }
}

class Logger {
  private minLevel: number;
  private sessionId: string;
  private logs: LogEntry[];
  private maxLogs: number;

  constructor() {
    this.minLevel = process.env.NODE_ENV === 'development' ? 0 : 1;
    this.sessionId = this.generateSessionId();
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `%c[${timestamp}] ${level.prefix}: ${message}${dataStr}`;
  }

  private log(level: string, message: string, data?: any): void {
    const logLevel = LOG_LEVELS[level];
    if (!logLevel || logLevel.level < this.minLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: logLevel.prefix,
      message,
      data,
      sessionId: this.sessionId
    };

    // Add to logs array
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    console.log(this.formatMessage(logLevel, message, data), `color: ${logLevel.color}`);
  }

  debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  success(message: string, data?: any): void {
    this.log('SUCCESS', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  // Component-specific logging
  component(componentName: string, action: string, data?: any): void {
    this.debug(`[${componentName}] ${action}`, data);
  }

  // API call logging
  api(method: string, url: string, status: number, duration: number, userId?: number): void {
    this.info(`API ${method} ${url}`, { status, duration, userId });
  }

  // Database query logging
  db(query: string, duration: number, count: number): void {
    this.debug(`DB ${query}`, { duration, count });
  }

  // Navigation logging
  navigation(from: string, to: string, duration?: number): void {
    this.info('NAVIGATION', { from, to, duration });
  }

  // Get recent logs
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in components
export type { LogEntry, LogLevel };