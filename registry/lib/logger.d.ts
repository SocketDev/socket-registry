/// <reference types="node" />
import { Console, ConsoleConstructorOptions } from 'node:console'
import { Writable } from 'node:stream'

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
  export const incLogCallCountSymbol: unique symbol
  export const lastWasBlankSymbol: unique symbol
  export const LOG_SYMBOLS: LogSymbols
  export class Logger extends Console {
    static get LOG_SYMBOLS(): LogSymbols
    constructor(
      stdout: Writable,
      stderr?: Writable,
      ignoreErrors?: boolean | undefined
    )
    constructor(options: ConsoleConstructorOptions)
    [incLogCallCountSymbol](): Logger
    'Symbol(logger.logCallCount++)'(): Logger
    [lastWasBlankSymbol](value: boolean): Logger
    'Symbol(logger.lastWasBlank)'(value: boolean): Logger
    assert: LoggerMethods['assert']
    clear: LoggerMethods['clear']
    count: LoggerMethods['count']
    countReset: LoggerMethods['countReset']
    createTask(name: string): Task
    debug: LoggerMethods['debug']
    dedent(spaces?: number | undefined): Logger
    dir: LoggerMethods['dir']
    dirxml: LoggerMethods['dirxml']
    error: LoggerMethods['error']
    errorNewline(): Logger
    fail(...args: any[]): Logger
    group: LoggerMethods['group']
    groupCollapsed: LoggerMethods['groupCollapsed']
    groupEnd: LoggerMethods['groupEnd']
    indent(spaces?: number | undefined): Logger
    info: LoggerMethods['info']
    log: LoggerMethods['log']
    logCallCount: number
    logNewline(): Logger
    profile: LoggerMethods['profile']
    profileEnd: LoggerMethods['profileEnd']
    resetIndent(): Logger
    success(...args: any[]): Logger
    table: LoggerMethods['table']
    time: LoggerMethods['time']
    timeEnd: LoggerMethods['timeEnd']
    timeLog: LoggerMethods['timeLog']
    trace: LoggerMethods['trace']
    warn: LoggerMethods['warn']
  }
  export const logger: Logger
}
export = LoggerModule
