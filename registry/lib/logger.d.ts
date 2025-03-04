/// <reference types="node" />
import { Console, ConsoleConstructorOptions } from 'node:console'

declare namespace LoggerModule {
  type LoggerMethods = {
    [K in keyof Console]: Console[K] extends (...args: infer A) => any
      ? (...args: A) => Logger
      : Console[K]
  }
  export type LogSymbols = {
    fail: string
    info: string
    success: string
    warn: string
  }
  export interface Task {
    run<T>(f: () => T): T
  }
  export class Logger extends Console {
    static get LOG_SYMBOLS(): LogSymbols
    new(
      stdout: NodeJS.WritableStream,
      stderr?: NodeJS.WritableStream,
      ignoreErrors?: boolean | undefined
    ): Logger
    new(options: ConsoleConstructorOptions): Logger
    assert: LoggerMethods['assert']
    clear: LoggerMethods['clear']
    count: LoggerMethods['count']
    countReset: LoggerMethods['countReset']
    createTask(name: string): Task
    debug: LoggerMethods['debug']
    dir: LoggerMethods['dir']
    dirxml: LoggerMethods['dirxml']
    error: LoggerMethods['error']
    fail(...args: any[]): Logger
    group: LoggerMethods['group']
    groupCollapsed: LoggerMethods['groupCollapsed']
    groupEnd: LoggerMethods['groupEnd']
    info: LoggerMethods['info']
    log: LoggerMethods['log']
    profile: LoggerMethods['profile']
    profileEnd: LoggerMethods['profileEnd']
    success(...args: any[]): Logger
    table: LoggerMethods['table']
    time: LoggerMethods['time']
    timeEnd: LoggerMethods['timeEnd']
    timeLog: LoggerMethods['timeLog']
    trace: LoggerMethods['trace']
    warn: LoggerMethods['warn']
  }
  export const LOG_SYMBOLS: LogSymbols
  export const logger: Logger
}
export = LoggerModule
