interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 1000;

  generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  log(
    level: ErrorLog['level'],
    message: string,
    options: Partial<Omit<ErrorLog, 'id' | 'timestamp' | 'level' | 'message'>> = {}
  ): string {
    const id = this.generateId();
    const entry: ErrorLog = {
      id,
      timestamp: new Date().toISOString(),
      level,
      message,
      ...options
    };

    this.logs.unshift(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    if (level === 'error') {
      console.error(`[ERROR ${id}]`, message, options.stack || '');
    } else if (level === 'warn') {
      console.warn(`[WARN ${id}]`, message);
    }

    return id;
  }

  error(message: string, options?: Partial<Omit<ErrorLog, 'id' | 'timestamp' | 'level' | 'message'>>): string {
    return this.log('error', message, options);
  }

  warn(message: string, options?: Partial<Omit<ErrorLog, 'id' | 'timestamp' | 'level' | 'message'>>): string {
    return this.log('warn', message, options);
  }

  info(message: string, options?: Partial<Omit<ErrorLog, 'id' | 'timestamp' | 'level' | 'message'>>): string {
    return this.log('info', message, options);
  }

  logRequestError(
    error: Error,
    req: { path?: string; method?: string; ip?: string; headers?: Record<string, string | string[] | undefined> },
    userId?: string
  ): string {
    return this.error(error.message, {
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'] as string | undefined,
      userId
    });
  }

  getLogs(options: {
    level?: ErrorLog['level'];
    limit?: number;
    since?: string;
  } = {}): ErrorLog[] {
    let result = [...this.logs];

    if (options.level) {
      result = result.filter(log => log.level === options.level);
    }

    if (options.since) {
      const sinceDate = new Date(options.since);
      result = result.filter(log => new Date(log.timestamp) >= sinceDate);
    }

    if (options.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  getLog(id: string): ErrorLog | undefined {
    return this.logs.find(log => log.id === id);
  }

  getStats(): {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    last24Hours: number;
  } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      total: this.logs.length,
      errors: this.logs.filter(l => l.level === 'error').length,
      warnings: this.logs.filter(l => l.level === 'warn').length,
      info: this.logs.filter(l => l.level === 'info').length,
      last24Hours: this.logs.filter(l => new Date(l.timestamp) >= yesterday).length
    };
  }

  clear(): void {
    this.logs = [];
  }
}

export const errorLogger = new ErrorLogger();
export type { ErrorLog };

export function logError(error: Error | unknown, context?: Record<string, unknown>): string {
  const err = error instanceof Error ? error : new Error(String(error));
  return errorLogger.log('error', err.message, {
    stack: err.stack,
    context
  });
}

export function logWarn(message: string, context?: Record<string, unknown>): string {
  return errorLogger.log('warn', message, { context });
}

export function logInfo(message: string, context?: Record<string, unknown>): string {
  return errorLogger.log('info', message, { context });
}
