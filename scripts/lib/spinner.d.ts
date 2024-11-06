declare interface SpinnerOptions {
  ci?: boolean
  signal?: AbortSignal
  [key: string]: any
}
declare class Spinner {
  constructor(message: string, options?: SpinnerOptions)
  get message(): string
  set message(text: string)
  start(): this
  stop(...args: any[]): this
}
declare const spinner: {
  Spinner: typeof Spinner
}
export = spinner
