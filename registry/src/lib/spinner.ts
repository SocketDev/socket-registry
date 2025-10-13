/**
 * @fileoverview CLI spinner utilities for long-running operations.
 * Provides animated progress indicators with CI environment detection.
 */

import ENV from './constants/ENV'
import abortSignal from './constants/abort-signal'
import { hasOwn } from './objects'
import { isBlankString } from './strings'
import yoctoSpinner from '../external/@socketregistry/yocto-spinner'

import type { Writable } from 'node:stream'

export type Color =
  | 'black'
  | 'blue'
  | 'cyan'
  | 'gray'
  | 'green'
  | 'magenta'
  | 'red'
  | 'white'
  | 'yellow'

export type ProgressInfo = {
  current: number
  total: number
  unit?: string | undefined
}

export type Spinner = {
  color: Color
  spinner: SpinnerStyle

  get isSpinning(): boolean

  clear(): Spinner
  debug(text?: string | undefined, ...extras: unknown[]): Spinner
  debugAndStop(text?: string | undefined, ...extras: unknown[]): Spinner
  error(text?: string | undefined, ...extras: unknown[]): Spinner
  errorAndStop(text?: string | undefined, ...extras: unknown[]): Spinner
  fail(text?: string | undefined, ...extras: unknown[]): Spinner
  failAndStop(text?: string | undefined, ...extras: unknown[]): Spinner

  // text property returns a method via _textMethod override
  text(value: string): Spinner
  text(): string

  indent(spaces?: number | undefined): Spinner
  dedent(spaces?: number | undefined): Spinner

  info(text?: string | undefined, ...extras: unknown[]): Spinner
  infoAndStop(text?: string | undefined, ...extras: unknown[]): Spinner
  log(text?: string | undefined, ...extras: unknown[]): Spinner
  logAndStop(text?: string | undefined, ...extras: unknown[]): Spinner

  start(text?: string | undefined): Spinner
  stop(text?: string | undefined): Spinner
  stopAndPersist(text?: string | undefined): Spinner

  step(text?: string | undefined, ...extras: unknown[]): Spinner
  substep(text?: string | undefined, ...extras: unknown[]): Spinner

  success(text?: string | undefined, ...extras: unknown[]): Spinner
  successAndStop(text?: string | undefined, ...extras: unknown[]): Spinner

  done(text?: string | undefined, ...extras: unknown[]): Spinner
  doneAndStop(text?: string | undefined, ...extras: unknown[]): Spinner

  progress(current: number, total: number, unit?: string | undefined): Spinner
  progressStep(amount?: number): Spinner

  warn(text?: string | undefined, ...extras: unknown[]): Spinner
  warnAndStop(text?: string | undefined, ...extras: unknown[]): Spinner
}

export type SpinnerOptions = {
  readonly color?: Color | undefined
  readonly spinner?: SpinnerStyle | undefined
  readonly signal?: AbortSignal | undefined
  readonly stream?: Writable | undefined
  readonly text?: string | undefined
}

export type SpinnerStyle = {
  readonly frames: string[]
  readonly interval?: number | undefined
}

export const ciSpinner: SpinnerStyle = {
  frames: [''],
  interval: 2147483647,
}

function desc(value: unknown) {
  return {
    __proto__: null,
    configurable: true,
    value,
    writable: true,
  }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trimStart() : ''
}

function formatProgress(progress: ProgressInfo): string {
  const { current, total, unit } = progress
  const percentage = Math.round((current / total) * 100)
  const bar = renderProgressBar(percentage)
  const count = unit ? `${current}/${total} ${unit}` : `${current}/${total}`
  return `${bar} ${percentage}% (${count})`
}

function renderProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  // Use cyan color for the progress bar
  const colors = /*@__PURE__*/ require('../external/yoctocolors-cjs')
  return colors.cyan(bar)
}

let _cliSpinners: Record<string, SpinnerStyle> | undefined

/**
 * Get available CLI spinner styles or a specific style by name.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getCliSpinners(
  styleName?: string | undefined,
): SpinnerStyle | Record<string, SpinnerStyle> | undefined {
  if (_cliSpinners === undefined) {
    const YoctoCtor = yoctoSpinner as any
    // Get the YoctoSpinner class to access static properties
    const tempInstance = YoctoCtor({})
    const YoctoSpinnerClass = tempInstance.constructor as any
    _cliSpinners = YoctoSpinnerClass.spinners
  }
  if (typeof styleName === 'string' && _cliSpinners) {
    return hasOwn(_cliSpinners, styleName) ? _cliSpinners[styleName] : undefined
  }
  return _cliSpinners
}

let _Spinner: {
  new (options?: SpinnerOptions | undefined): Spinner
}
let _defaultSpinner: SpinnerStyle | undefined

/**
 * Create a spinner instance for displaying loading indicators.
 */
/*@__NO_SIDE_EFFECTS__*/
export function Spinner(options?: SpinnerOptions | undefined): Spinner {
  if (_Spinner === undefined) {
    const YoctoCtor = yoctoSpinner as any
    // Get the actual YoctoSpinner class from an instance
    const tempInstance = YoctoCtor({})
    const YoctoSpinnerClass = tempInstance.constructor

    /*@__PURE__*/
    _Spinner = class SpinnerClass extends (YoctoSpinnerClass as any) {
      declare isSpinning: boolean
      #progress?: ProgressInfo | undefined
      #baseText: string = ''
      #indentation: string = ''

      constructor(options?: SpinnerOptions | undefined) {
        // eslint-disable-next-line constructor-super
        super({
          signal: abortSignal,
          ...options,
        })

        // Set up the text method for yocto-spinner override.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        ;(this as any)._textMethod = function (value?: string) {
          if (arguments.length === 0) {
            // Getter mode - return base text without indentation.
            return self.#baseText
          }
          // Setter mode.
          self.#baseText = normalizeText(value)
          self.#updateSpinnerText()
          return self
        }
      }

      #apply(methodName: string, args: unknown[]) {
        let extras: unknown[]
        let text = args.at(0)
        if (typeof text === 'string') {
          extras = args.slice(1)
        } else {
          extras = args
          text = ''
        }
        const wasSpinning = this.isSpinning
        const normalized = normalizeText(text)
        super[methodName](normalized)
        const {
          incLogCallCountSymbol,
          lastWasBlankSymbol,
          logger,
        } = /*@__PURE__*/ require('./logger.js')
        if (methodName === 'stop') {
          if (wasSpinning && normalized) {
            logger[lastWasBlankSymbol](isBlankString(normalized))
            logger[incLogCallCountSymbol]()
          }
        } else {
          logger[lastWasBlankSymbol](false)
          logger[incLogCallCountSymbol]()
        }
        if (extras.length) {
          logger.log(...extras)
          logger[lastWasBlankSymbol](false)
        }
        return this
      }

      #applyAndKeepSpinning(methodName: string, args: unknown[]) {
        const wasSpinning = this.isSpinning
        this.#apply(methodName, args)
        if (wasSpinning) {
          this.start()
        }
        return this
      }

      debug(...args: unknown[]) {
        const { isDebug } = /*@__PURE__*/ require('./debug.js')
        if (isDebug()) {
          return this.#applyAndKeepSpinning('info', args)
        }
        return this
      }

      debugAndStop(...args: unknown[]) {
        const { isDebug } = /*@__PURE__*/ require('./debug.js')
        if (isDebug()) {
          return this.#apply('info', args)
        }
        return this
      }

      fail(...args: unknown[]) {
        return this.#applyAndKeepSpinning('error', args)
      }

      failAndStop(...args: unknown[]) {
        return this.#apply('error', args)
      }

      // The text getter/setter from parent class now behaves like a method
      // thanks to _textMethodOverride set in constructor.

      indent(spaces?: number) {
        // Pass 0 to reset indentation
        if (spaces === 0) {
          this.#indentation = ''
        } else {
          const amount = spaces ?? 2
          this.#indentation += ' '.repeat(amount)
        }
        this.#updateSpinnerText()
        return this
      }

      dedent(spaces?: number) {
        // Pass 0 to reset indentation
        if (spaces === 0) {
          this.#indentation = ''
        } else {
          const amount = spaces ?? 2
          const newLength = Math.max(0, this.#indentation.length - amount)
          this.#indentation = this.#indentation.slice(0, newLength)
        }
        this.#updateSpinnerText()
        return this
      }

      info(...args: unknown[]) {
        return this.#applyAndKeepSpinning('info', args)
      }

      infoAndStop(...args: unknown[]) {
        return this.#apply('info', args)
      }

      log(...args: unknown[]) {
        return this.#applyAndKeepSpinning('stop', args)
      }

      logAndStop(...args: unknown[]) {
        return this.#apply('stop', args)
      }

      start(...args: unknown[]) {
        if (args.length) {
          const text = args.at(0)
          const normalized = normalizeText(text)
          // We clear this.text on start when `text` is falsy because yocto-spinner
          // will not clear it otherwise.
          if (!normalized) {
            this.#baseText = ''
            super.text = ''
          } else {
            this.#baseText = normalized
          }
        }
        this.#updateSpinnerText()
        return this.#apply('start', args)
      }

      step(...args: unknown[]) {
        const text = args[0]
        if (typeof text === 'string') {
          // Add blank line before step for visual separation.
          if (this.isSpinning) {
            this.stop()
            const { logger } = /*@__PURE__*/ require('./logger.js')
            logger.error('')
            this.start()
          } else {
            const { logger } = /*@__PURE__*/ require('./logger.js')
            logger.error('')
          }
          args[0] = text
        }
        return this.#applyAndKeepSpinning('log', args)
      }

      substep(...args: unknown[]) {
        const text = args[0]
        if (typeof text === 'string') {
          // Add 2-space indent for substep.
          args[0] = `  ${text}`
        }
        return this.#applyAndKeepSpinning('log', args)
      }

      stop(...args: unknown[]) {
        // We clear this.text on stop because yocto-spinner will not clear it.
        this.#baseText = ''
        this.#progress = undefined
        super.text = ''
        return this.#apply('stop', args)
      }

      success(...args: unknown[]) {
        return this.#applyAndKeepSpinning('success', args)
      }

      successAndStop(...args: unknown[]) {
        return this.#apply('success', args)
      }

      // Alias done for success (shorter name).
      done(...args: unknown[]) {
        return this.#applyAndKeepSpinning('success', args)
      }

      doneAndStop(...args: unknown[]) {
        return this.#apply('success', args)
      }

      warn(...args: unknown[]) {
        return this.#applyAndKeepSpinning('warning', args)
      }

      warnAndStop(...args: unknown[]) {
        return this.#apply('warning', args)
      }

      #updateSpinnerText() {
        let displayText = this.#baseText

        if (this.#progress) {
          const progressText = formatProgress(this.#progress)
          displayText = displayText
            ? `${displayText} ${progressText}`
            : progressText
        }

        // Apply indentation
        if (this.#indentation && displayText) {
          displayText = this.#indentation + displayText
        }

        // Call the parent class's text setter
        super.text = displayText
      }

      progress = (
        current: number,
        total: number,
        unit?: string | undefined,
      ) => {
        this.#progress = {
          __proto__: null,
          current,
          total,
          ...(unit ? { unit } : {}),
        } as ProgressInfo
        this.#updateSpinnerText()
        return this
      }

      progressStep(amount: number = 1) {
        if (this.#progress) {
          const newCurrent = this.#progress.current + amount
          this.#progress = {
            __proto__: null,
            current: Math.max(0, Math.min(newCurrent, this.#progress.total)),
            total: this.#progress.total,
            ...(this.#progress.unit ? { unit: this.#progress.unit } : {}),
          } as ProgressInfo
          this.#updateSpinnerText()
        }
        return this
      }
    } as unknown as {
      new (options?: SpinnerOptions | undefined): Spinner
    }
    // Add aliases.
    Object.defineProperties(_Spinner.prototype, {
      error: desc(_Spinner.prototype.fail),
      errorAndStop: desc(_Spinner.prototype.failAndStop),
      warning: desc(_Spinner.prototype.warn),
      warningAndStop: desc(_Spinner.prototype.warnAndStop),
    })
    _defaultSpinner = ENV.CI ? ciSpinner : undefined
  }
  return new _Spinner({
    spinner: _defaultSpinner,
    ...options,
  })
}

export const spinner = Spinner()

export type WithSpinnerOptions<T> = {
  message: string
  operation: () => Promise<T>
  spinner?: Spinner | undefined
}

/**
 * Execute an async operation with spinner lifecycle management.
 * Ensures spinner.stop() is always called via try/finally, even if the operation throws.
 *
 * @param options - Configuration object
 * @param options.message - Message to display while spinner is running
 * @param options.operation - Async function to execute
 * @param options.spinner - Optional spinner instance (if not provided, no spinner is used)
 * @returns Result of the operation
 * @throws Re-throws any error from operation after stopping spinner
 *
 * @example
 * import { spinner, withSpinner } from '@socketsecurity/registry/lib/spinner'
 *
 * // With spinner instance
 * await withSpinner({
 *   message: 'Processing...',
 *   operation: async () => {
 *     return await processData()
 *   },
 *   spinner
 * })
 *
 * // Without spinner instance (no-op)
 * await withSpinner({
 *   message: 'Processing...',
 *   operation: async () => {
 *     return await processData()
 *   }
 * })
 */
export async function withSpinner<T>(
  options: WithSpinnerOptions<T>,
): Promise<T> {
  const { message, operation, spinner } = {
    __proto__: null,
    ...options,
  } as WithSpinnerOptions<T>

  if (!spinner) {
    return await operation()
  }

  spinner.start(message)
  try {
    return await operation()
  } finally {
    spinner.stop()
  }
}

export type WithSpinnerRestoreOptions<T> = {
  operation: () => Promise<T>
  spinner?: Spinner | undefined
  wasSpinning: boolean
}

/**
 * Execute an async operation with conditional spinner restart.
 * Useful when you need to temporarily stop a spinner for an operation,
 * then restore it to its previous state.
 *
 * @param options - Configuration object
 * @param options.operation - Async function to execute
 * @param options.spinner - Optional spinner instance to manage
 * @param options.wasSpinning - Whether spinner was spinning before
 * @returns Result of the operation
 * @throws Re-throws any error from operation after restoring spinner state
 *
 * @example
 * import { spinner, withSpinnerRestore } from '@socketsecurity/registry/lib/spinner'
 *
 * const wasSpinning = spinner.isSpinning
 * spinner.stop()
 *
 * const result = await withSpinnerRestore({
 *   operation: async () => {
 *     // Do work without spinner
 *     return await someOperation()
 *   },
 *   spinner,
 *   wasSpinning
 * })
 */
export async function withSpinnerRestore<T>(
  options: WithSpinnerRestoreOptions<T>,
): Promise<T> {
  const { operation, spinner, wasSpinning } = {
    __proto__: null,
    ...options,
  } as WithSpinnerRestoreOptions<T>

  try {
    return await operation()
  } finally {
    if (spinner && wasSpinning) {
      spinner.start()
    }
  }
}

export type WithSpinnerSyncOptions<T> = {
  message: string
  operation: () => T
  spinner?: Spinner | undefined
}

/**
 * Execute a synchronous operation with spinner lifecycle management.
 * Ensures spinner.stop() is always called via try/finally, even if the operation throws.
 *
 * @param options - Configuration object
 * @param options.message - Message to display while spinner is running
 * @param options.operation - Function to execute
 * @param options.spinner - Optional spinner instance (if not provided, no spinner is used)
 * @returns Result of the operation
 * @throws Re-throws any error from operation after stopping spinner
 *
 * @example
 * import { spinner, withSpinnerSync } from '@socketsecurity/registry/lib/spinner'
 *
 * const result = withSpinnerSync({
 *   message: 'Processing...',
 *   operation: () => {
 *     return processDataSync()
 *   },
 *   spinner
 * })
 */
export function withSpinnerSync<T>(options: WithSpinnerSyncOptions<T>): T {
  const { message, operation, spinner } = {
    __proto__: null,
    ...options,
  } as WithSpinnerSyncOptions<T>

  if (!spinner) {
    return operation()
  }

  spinner.start(message)
  try {
    return operation()
  } finally {
    spinner.stop()
  }
}
