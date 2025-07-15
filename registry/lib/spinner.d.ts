/// <reference types="node" />
import { Writable } from 'node:stream'

declare type Color =
  | 'black'
  | 'blue'
  | 'cyan'
  | 'gray'
  | 'green'
  | 'magenta'
  | 'red'
  | 'white'
  | 'yellow'
declare type Options = {
  readonly color?: Color | undefined
  readonly spinner?: SpinnerStyle | undefined
  readonly signal?: AbortSignal | undefined
  readonly stream?: Writable | undefined
  readonly text?: string | undefined
}
declare type SpinnerStyle = {
  readonly frames: string[]
  readonly interval?: number | undefined
}
declare type Spinner = {
  color: Color
  text: string
  get isSpinning(): boolean
  clear(): Spinner
  debug(text?: string | undefined, ...extras: any[]): Spinner
  debugAndStop(text?: string | undefined, ...extras: any[]): Spinner
  dedent(spaces?: number | undefined): Spinner
  error(text?: string | undefined, ...extras: any[]): Spinner
  errorAndStop(text?: string | undefined, ...extras: any[]): Spinner
  fail(text?: string | undefined, ...extras: any[]): Spinner
  failAndStop(text?: string | undefined, ...extras: any[]): Spinner
  getText(): string
  indent(spaces?: number | undefined): Spinner
  info(text?: string | undefined, ...extras: any[]): Spinner
  infoAndStop(text?: string | undefined, ...extras: any[]): Spinner
  log(text?: string | undefined, ...extras: any[]): Spinner
  logAndStop(text?: string | undefined, ...extras: any[]): Spinner
  resetIndent(): Spinner
  setText(text?: string | undefined): Spinner
  start(text?: string | undefined, ...extras: any[]): Spinner
  stop(finalText?: string | undefined, ...extras: any[]): Spinner
  success(text?: string | undefined, ...extras: any[]): Spinner
  successAndStop(text?: string | undefined, ...extras: any[]): Spinner
  warn(text?: string | undefined, ...extras: any[]): Spinner
  warnAndStop(text?: string | undefined, ...extras: any[]): Spinner
  warning(text?: string | undefined, ...extras: any[]): Spinner
  warningAndStop(text?: string | undefined, ...extras: any[]): Spinner
}
declare const SpinnerModule: {
  Spinner: {
    new (options?: Options): Spinner
    (options?: Options): Spinner
  } & Spinner
}
declare namespace SpinnerModule {
  export { Color, Options, Spinner, SpinnerStyle }
}
export = SpinnerModule
