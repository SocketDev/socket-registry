declare namespace LoggerModule {
  export class Logger {
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
