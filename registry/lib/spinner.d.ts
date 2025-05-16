import {
  Color as YoctoColor,
  Options as YoctoOptions,
  Spinner as YoctoSpinner,
  SpinnerStyle as YoctoSpinnerStyle
} from '@socketregistry/yocto-spinner/index.d.cjs'

import { Remap } from './objects'

declare type SpinnerType = Remap<
  Omit<
    YoctoSpinner,
    | 'dedent'
    | 'error'
    | 'indent'
    | 'info'
    | 'resetIndent'
    | 'start'
    | 'stop'
    | 'success'
    | 'warning'
  > & {
    debug(text?: string | undefined, ...extras: any[]): SpinnerType
    debugAndStop(text?: string | undefined, ...extras: any[]): SpinnerType
    dedent(spaces?: number | undefined): SpinnerType
    error(text?: string | undefined, ...extras: any[]): SpinnerType
    errorAndStop(text?: string | undefined, ...extras: any[]): SpinnerType
    fail(text?: string | undefined, ...extras: any[]): SpinnerType
    failAndStop(text?: string | undefined, ...extras: any[]): SpinnerType
    getText(): string
    indent(spaces?: number | undefined): SpinnerType
    info(text?: string | undefined, ...extras: any[]): SpinnerType
    infoAndStop(text?: string | undefined, ...extras: any[]): SpinnerType
    log(text?: string | undefined, ...extras: any[]): SpinnerType
    logAndStop(text?: string | undefined, ...extras: any[]): SpinnerType
    resetIndent(): SpinnerType
    setText(text?: string | undefined): SpinnerType
    start(text?: string | undefined, ...extras: any[]): SpinnerType
    stop(finalText?: string | undefined, ...extras: any[]): SpinnerType
    success(text?: string | undefined, ...extras: any[]): SpinnerType
    successAndStop(text?: string | undefined, ...extras: any[]): SpinnerType
    warn(text?: string | undefined, ...extras: any[]): SpinnerType
    warnAndStop(text?: string | undefined, ...extras: any[]): SpinnerType
    warning(text?: string | undefined, ...extras: any[]): SpinnerType
    warningAndStop(text?: string | undefined, ...extras: any[]): SpinnerType
  }
>

declare const SpinnerModule: {
  Spinner: {
    new (options?: YoctoOptions): SpinnerType
    (options?: YoctoOptions): SpinnerType
  } & SpinnerType
}
declare namespace SpinnerModule {
  export type Color = YoctoColor
  export type Options = YoctoOptions
  export type Spinner = SpinnerType
  export type SpinnerStyle = YoctoSpinnerStyle
}
export = SpinnerModule
