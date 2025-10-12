declare class YoctoSpinner {
  constructor(options?: { text?: string })
  start(text?: string): this
  stop(): this
  success(text?: string): this
  error(text?: string): this
  warning(text?: string): this
  info(text?: string): this
  clear(): this
}

export = YoctoSpinner
