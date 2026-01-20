/**
 * Logger utility for consistent error and info logging
 */

export type LogLevel = "INFO" | "WARN" | "ERROR"

export class Logger {
  private prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  info(message: string, data?: unknown): void {
    console.log(`[${this.prefix}]`, message)
    if (data) {
      console.log(`[${this.prefix}] Data:`, data)
    }
  }

  warn(message: string, data?: unknown): void {
    console.warn(`[${this.prefix}]`, message)
    if (data) {
      console.warn(`[${this.prefix}] Data:`, data)
    }
  }

  error(message: string, error?: Error | unknown): void {
    console.error(`[${this.prefix}]`, message)
    if (error) {
      console.error(`[${this.prefix}] Error:`, error)
    }
  }
}

export const logger = new Logger("CageClock")
