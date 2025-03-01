declare namespace LoggerModule {
  export type LogSymbols = {
    error: string
    info: string
    success: string
    warning: string
  }
  export class Logger {
    static get LOG_SYMBOLS(): LogSymbols
    constructor()
    error(...args: any[]): Logger
    info(...args: any[]): Logger
    log(...args: any[]): Logger
    success(...args: any[]): Logger
    warn(...args: any[]): Logger
  }
  export const logger: Logger
}
export = LoggerModule
