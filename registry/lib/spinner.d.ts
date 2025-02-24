import {
  Options as YoctoOptions,
  Spinner as YoctoSpinner
} from '@socketregistry/yocto-spinner/index.cjs'
import { Remap } from './objects'

declare type Options = YoctoOptions
declare type Spinner = YoctoSpinner
declare const SpinnerModule: {
  Spinner: Remap<
    Omit<
      Spinner,
      'error' | 'info' | 'start' | 'stop' | 'success' | 'warning'
    > & {
      new (options?: Options): Spinner
      (options?: Options): Spinner
      error(text?: string | undefined, ...extras: any[]): Spinner
      errorAndStop(text?: string | undefined, ...extras: any[]): Spinner
      getText(): string
      info(text?: string | undefined, ...extras: any[]): Spinner
      infoAndStop(text?: string | undefined, ...extras: any[]): Spinner
      log(text?: string | undefined, ...extras: any[]): Spinner
      logAndStop(text?: string | undefined, ...extras: any[]): Spinner
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
  >
}
declare namespace SpinnerModule {
  export { Options, Spinner }
}
export = SpinnerModule
