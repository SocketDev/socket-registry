declare type Logger = {
  error(...args: any[]): Logger
  info(...args: any[]): Logger
  log(...args: any[]): Logger
  success(...args: any[]): Logger
  warn(...args: any[]): Logger
}
declare const LoggerModule: {
  logger: Logger
}
declare namespace LoggerModule {}
export = LoggerModule
