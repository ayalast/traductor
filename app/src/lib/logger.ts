type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogEntry = {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: unknown
  stack?: string
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 500
  private listeners: Array<(logs: LogEntry[]) => void> = []

  private addLog(level: LogLevel, category: string, message: string, data?: unknown, stack?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      stack,
    }

    this.logs.push(entry)

    // Mantener solo los últimos maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Notificar a los listeners
    this.notifyListeners()

    // En desarrollo, también mostrar en consola
    if (import.meta.env.DEV) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[consoleMethod](`[${level.toUpperCase()}] ${category}: ${message}`, data ?? '')
    }
  }

  debug(category: string, message: string, data?: unknown) {
    this.addLog('debug', category, message, data)
  }

  info(category: string, message: string, data?: unknown) {
    this.addLog('info', category, message, data)
  }

  warn(category: string, message: string, data?: unknown) {
    this.addLog('warn', category, message, data)
  }

  error(category: string, message: string, error?: unknown) {
    const stack = error instanceof Error ? error.stack : undefined
    this.addLog('error', category, message, error, stack)
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
    this.notifyListeners()
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.logs]))
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

export const logger = new Logger()

// Capturar errores globales no manejados
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('global', 'Uncaught error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('global', 'Unhandled promise rejection', {
      reason: event.reason,
    })
  })
}
