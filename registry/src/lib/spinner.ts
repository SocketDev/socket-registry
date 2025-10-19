/**
 * @fileoverview CLI spinner utilities for long-running operations.
 * Provides animated progress indicators with CI environment detection.
 */

import type { Writable } from 'node:stream'

// Note: getAbortSignal is imported lazily to avoid circular dependencies.
import { CI } from '#env/ci'
import yoctoSpinner from '../external/@socketregistry/yocto-spinner'

import { generateSocketSpinnerFrames } from './effects/pulse-frames'
import type {
  ShimmerColorGradient,
  ShimmerConfig,
  ShimmerDirection,
  ShimmerState,
} from './effects/text-shimmer'
import { applyShimmer, COLOR_INHERIT, DIR_LTR } from './effects/text-shimmer'
import { hasOwn } from './objects'
import { isBlankString, stringWidth } from './strings'

export type ColorName =
  | 'black'
  | 'blue'
  | 'blueBright'
  | 'cyan'
  | 'cyanBright'
  | 'gray'
  | 'green'
  | 'greenBright'
  | 'magenta'
  | 'magentaBright'
  | 'red'
  | 'redBright'
  | 'white'
  | 'whiteBright'
  | 'yellow'
  | 'yellowBright'

export type ColorInherit = 'inherit'

export type ColorRgb = readonly [number, number, number]

export type ColorValue = ColorName | ColorRgb

export type SymbolType = 'fail' | 'info' | 'success' | 'warn'

// Map color names to RGB values.
const colorToRgb: Record<ColorName, ColorRgb> = {
  __proto__: null,
  black: [0, 0, 0],
  blue: [0, 0, 255],
  blueBright: [100, 149, 237],
  cyan: [0, 255, 255],
  cyanBright: [0, 255, 255],
  gray: [128, 128, 128],
  green: [0, 128, 0],
  greenBright: [0, 255, 0],
  magenta: [255, 0, 255],
  magentaBright: [255, 105, 180],
  red: [255, 0, 0],
  redBright: [255, 69, 0],
  white: [255, 255, 255],
  whiteBright: [255, 255, 255],
  yellow: [255, 255, 0],
  yellowBright: [255, 255, 153],
} as Record<ColorName, ColorRgb>

/**
 * Check if value is RGB tuple.
 */
function isRgbTuple(value: ColorValue): value is ColorRgb {
  return Array.isArray(value)
}

/**
 * Convert ColorValue to RGB tuple.
 */
function toRgb(color: ColorValue): ColorRgb {
  if (isRgbTuple(color)) {
    return color
  }
  return colorToRgb[color]
}

export type ProgressInfo = {
  current: number
  total: number
  unit?: string | undefined
}

export type ShimmerInfo = ShimmerState & {
  color: ColorInherit | ColorValue | ShimmerColorGradient
}

export type Spinner = {
  color: ColorRgb
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

  shimmer(enabled: boolean): Spinner
  shimmer(config: Partial<ShimmerConfig> | ShimmerDirection): Spinner

  warn(text?: string | undefined, ...extras: unknown[]): Spinner
  warnAndStop(text?: string | undefined, ...extras: unknown[]): Spinner
}

export type SpinnerOptions = {
  readonly color?: ColorValue | undefined
  readonly shimmer?: ShimmerConfig | ShimmerDirection | undefined
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
  interval: 2_147_483_647,
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
 * Extends the standard cli-spinners collection with Socket custom spinners.
 *
 * @see https://github.com/sindresorhus/cli-spinners/blob/main/spinners.json
 *
 * Custom spinners:
 * - `socket` (default): Socket pulse animation with sparkles and lightning
 */
/*@__NO_SIDE_EFFECTS__*/
export function getCliSpinners(
  styleName?: string | undefined,
): SpinnerStyle | Record<string, SpinnerStyle> | undefined {
  if (_cliSpinners === undefined) {
    // biome-ignore lint/suspicious/noExplicitAny: Accessing internal yocto-spinner constructor.
    const YoctoCtor = yoctoSpinner as any
    // Get the YoctoSpinner class to access static properties.
    const tempInstance = YoctoCtor({})
    // biome-ignore lint/suspicious/noExplicitAny: Accessing internal yocto-spinner class.
    const YoctoSpinnerClass = tempInstance.constructor as any
    // Extend the standard cli-spinners collection with Socket custom spinners.
    _cliSpinners = {
      __proto__: null,
      ...YoctoSpinnerClass.spinners,
      socket: generateSocketSpinnerFrames(),
    }
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
 *
 * AUTO-CLEAR BEHAVIOR:
 * - All *AndStop() methods AUTO-CLEAR the spinner line via yocto-spinner.stop()
 *   Examples: doneAndStop(), successAndStop(), failAndStop(), etc.
 *
 * - Methods WITHOUT "AndStop" do NOT clear (spinner keeps spinning)
 *   Examples: done(), success(), fail(), etc.
 *
 * STREAM USAGE:
 * - Spinner animation: stderr (yocto-spinner default)
 * - Status methods (done, success, fail, info, warn, step, substep): stderr
 * - Data methods (log): stdout
 *
 * COMPARISON WITH LOGGER:
 * - logger.done() does NOT auto-clear (requires manual logger.clearLine())
 * - spinner.doneAndStop() DOES auto-clear (built into yocto-spinner.stop())
 * - Pattern: logger.clearLine().done() vs spinner.doneAndStop()
 */
/*@__NO_SIDE_EFFECTS__*/
export function Spinner(options?: SpinnerOptions | undefined): Spinner {
  if (_Spinner === undefined) {
    // biome-ignore lint/suspicious/noExplicitAny: Accessing internal yocto-spinner constructor.
    const YoctoCtor = yoctoSpinner as any
    // Get the actual YoctoSpinner class from an instance
    const tempInstance = YoctoCtor({})
    const YoctoSpinnerClass = tempInstance.constructor

    /*@__PURE__*/
    // biome-ignore lint/suspicious/noExplicitAny: Extending yocto-spinner class.
    _Spinner = class SpinnerClass extends (YoctoSpinnerClass as any) {
      declare isSpinning: boolean
      #baseText: string = ''
      #indentation: string = ''
      #progress?: ProgressInfo | undefined
      #shimmer?: ShimmerInfo | undefined
      #shimmerSavedConfig?: ShimmerInfo | undefined

      constructor(options?: SpinnerOptions | undefined) {
        const opts = { __proto__: null, ...options } as SpinnerOptions

        // Convert color option to RGB (default to Socket purple).
        const spinnerColor = opts.color ?? ([140, 82, 255] as const)

        // Validate RGB tuple if provided.
        if (
          isRgbTuple(spinnerColor) &&
          (spinnerColor.length !== 3 ||
            !spinnerColor.every(
              n => typeof n === 'number' && n >= 0 && n <= 255,
            ))
        ) {
          throw new TypeError(
            'RGB color must be an array of 3 numbers between 0 and 255',
          )
        }

        const spinnerColorRgb = toRgb(spinnerColor)

        // Parse shimmer config - can be object or direction string.
        let shimmerInfo: ShimmerInfo | undefined
        if (opts.shimmer) {
          let shimmerDir: ShimmerDirection
          let shimmerColor:
            | ColorInherit
            | ColorValue
            | ShimmerColorGradient
            | undefined
          // Default: 0.33 steps per frame (~150ms per step).
          let shimmerSpeed: number = 1 / 3

          if (typeof opts.shimmer === 'string') {
            shimmerDir = opts.shimmer
          } else {
            const shimmerConfig = {
              __proto__: null,
              ...opts.shimmer,
            } as ShimmerConfig
            shimmerDir = shimmerConfig.dir ?? DIR_LTR
            shimmerColor = shimmerConfig.color ?? COLOR_INHERIT
            shimmerSpeed = shimmerConfig.speed ?? 1 / 3
          }

          // Create shimmer info with initial animation state:
          // - COLOR_INHERIT means use spinner color dynamically
          // - ColorValue (name or RGB tuple) is an explicit override color
          // - undefined color defaults to COLOR_INHERIT
          // - speed controls steps per frame (lower = slower, e.g., 0.33 = ~150ms per step)
          shimmerInfo = {
            __proto__: null,
            color: shimmerColor === undefined ? COLOR_INHERIT : shimmerColor,
            currentDir: DIR_LTR,
            mode: shimmerDir,
            speed: shimmerSpeed,
            step: 0,
          } as ShimmerInfo
        }

        // eslint-disable-next-line constructor-super
        super({
          signal: require('#constants/process').getAbortSignal(),
          ...opts,
          // Pass RGB color directly to yocto-spinner (it now supports RGB).
          color: spinnerColorRgb,
          // onRenderFrame callback provides full control over frame + text layout.
          // Calculates spacing based on frame width to prevent text jumping.
          onRenderFrame: (
            frame: string,
            text: string,
            applyColor: (text: string) => string,
          ) => {
            const width = stringWidth(frame)
            // Narrow frames (width 1) get 2 spaces, wide frames (width 2) get 1 space.
            // Total width is consistent: 3 characters (frame + spacing) before text.
            const spacing = width === 1 ? '  ' : ' '
            return frame ? `${applyColor(frame)}${spacing}${text}` : text
          },
          // onFrameUpdate callback is called by yocto-spinner whenever a frame advances.
          // This ensures shimmer updates are perfectly synchronized with animation beats.
          onFrameUpdate: shimmerInfo
            ? () => {
                // Update parent's text without triggering render.
                // Parent's #skipRender flag prevents nested render calls.
                // Only update if we have base text to avoid blank frames.
                if (this.#baseText) {
                  super.text = this.#buildDisplayText()
                }
              }
            : undefined,
        })

        this.#shimmer = shimmerInfo
        this.#shimmerSavedConfig = shimmerInfo
      }

      // Override color getter to ensure it's always RGB.
      get color(): ColorRgb {
        const value = super.color
        return isRgbTuple(value) ? value : toRgb(value)
      }

      // Override color setter to always convert to RGB before passing to yocto-spinner.
      set color(value: ColorValue | ColorRgb) {
        super.color = isRgbTuple(value) ? value : toRgb(value)
      }

      /**
       * Apply a yocto-spinner method and update logger state.
       * Handles text normalization, extra arguments, and logger tracking.
       * @private
       */
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

      /**
       * Build the complete display text with progress, shimmer, and indentation.
       * Combines base text, progress bar, shimmer effects, and indentation.
       * @private
       */
      #buildDisplayText() {
        let displayText = this.#baseText

        if (this.#progress) {
          const progressText = formatProgress(this.#progress)
          displayText = displayText
            ? `${displayText} ${progressText}`
            : progressText
        }

        // Apply shimmer effect if enabled.
        if (displayText && this.#shimmer) {
          // If shimmer color is 'inherit', use current spinner color (getter ensures RGB).
          // Otherwise, check if it's a gradient (array of arrays) or single color.
          let shimmerColor: ColorRgb | ShimmerColorGradient
          if (this.#shimmer.color === COLOR_INHERIT) {
            shimmerColor = this.color
          } else if (Array.isArray(this.#shimmer.color[0])) {
            // It's a gradient - use as is.
            shimmerColor = this.#shimmer.color as ShimmerColorGradient
          } else {
            // It's a single color - convert to RGB.
            shimmerColor = toRgb(this.#shimmer.color as ColorValue)
          }

          displayText = applyShimmer(displayText, this.#shimmer, {
            color: shimmerColor,
            direction: this.#shimmer.mode,
          })
        }

        // Apply indentation
        if (this.#indentation && displayText) {
          displayText = this.#indentation + displayText
        }

        return displayText
      }

      /**
       * Show a status message without stopping the spinner.
       * Outputs the symbol and message to stderr, then continues spinning.
       */
      #showStatusAndKeepSpinning(symbolType: SymbolType, args: unknown[]) {
        let text = args.at(0)
        let extras: unknown[]
        if (typeof text === 'string') {
          extras = args.slice(1)
        } else {
          extras = args
          text = ''
        }

        const { LOG_SYMBOLS, logger } = /*@__PURE__*/ require('./logger.js')
        // Note: Status messages always go to stderr.
        logger.error(`${LOG_SYMBOLS[symbolType]} ${text}`, ...extras)
        return this
      }

      /**
       * Update the spinner's displayed text.
       * Rebuilds display text and triggers render.
       * @private
       */
      #updateSpinnerText() {
        // Call the parent class's text setter, which triggers render.
        super.text = this.#buildDisplayText()
      }

      /**
       * Show a debug message without stopping the spinner (only if debug mode enabled).
       * Outputs to stderr and continues spinning.
       */
      debug(...args: unknown[]) {
        const { isDebug } = /*@__PURE__*/ require('./debug.js')
        if (isDebug()) {
          return this.#showStatusAndKeepSpinning('info', args)
        }
        return this
      }

      /**
       * Show a debug message and stop the spinner (only if debug mode enabled).
       * Auto-clears the spinner line before displaying the message.
       */
      debugAndStop(...args: unknown[]) {
        const { isDebug } = /*@__PURE__*/ require('./debug.js')
        if (isDebug()) {
          return this.#apply('info', args)
        }
        return this
      }

      /**
       * Decrease indentation level.
       * Pass 0 to reset indentation to zero.
       * @param spaces - Number of spaces to remove (default: 2)
       */
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

      /**
       * Alias for success() (shorter name).
       * DESIGN DECISION: Unlike yocto-spinner, our done() does NOT stop the spinner.
       * Use doneAndStop() if you want to stop the spinner.
       */
      done(...args: unknown[]) {
        return this.#showStatusAndKeepSpinning('success', args)
      }

      /**
       * Show a done message and stop the spinner.
       * Auto-clears the spinner line before displaying the success message.
       */
      doneAndStop(...args: unknown[]) {
        return this.#apply('success', args)
      }

      /**
       * Show a failure message without stopping the spinner.
       * DESIGN DECISION: Unlike yocto-spinner, our fail() does NOT stop the spinner.
       * This allows displaying errors while continuing to spin.
       * Use failAndStop() if you want to stop the spinner.
       */
      fail(...args: unknown[]) {
        return this.#showStatusAndKeepSpinning('fail', args)
      }

      /**
       * Show a failure message and stop the spinner.
       * Auto-clears the spinner line before displaying the error message.
       */
      failAndStop(...args: unknown[]) {
        return this.#apply('error', args)
      }

      /**
       * Increase indentation level.
       * Pass 0 to reset indentation to zero.
       * @param spaces - Number of spaces to add (default: 2)
       */
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

      /**
       * Show an info message without stopping the spinner.
       * Outputs to stderr and continues spinning.
       */
      info(...args: unknown[]) {
        return this.#showStatusAndKeepSpinning('info', args)
      }

      /**
       * Show an info message and stop the spinner.
       * Auto-clears the spinner line before displaying the message.
       */
      infoAndStop(...args: unknown[]) {
        return this.#apply('info', args)
      }

      /**
       * Log a message to stdout without stopping the spinner.
       * Unlike other methods, this outputs to stdout for data logging.
       */
      log(...args: unknown[]) {
        const { logger } = /*@__PURE__*/ require('./logger.js')
        logger.log(...args)
        return this
      }

      /**
       * Log a message and stop the spinner.
       * Auto-clears the spinner line before displaying the message.
       */
      logAndStop(...args: unknown[]) {
        return this.#apply('stop', args)
      }

      /**
       * Update progress information displayed with the spinner.
       * Shows a progress bar with percentage and optional unit label.
       * @param current - Current progress value
       * @param total - Total progress value
       * @param unit - Optional unit label (e.g., 'files', 'items')
       */
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

      /**
       * Increment progress by a specified amount.
       * Updates the progress bar displayed with the spinner.
       * @param amount - Amount to increment (default: 1)
       */
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

      /**
       * Start the spinner animation with optional text.
       * Begins displaying the animated spinner.
       * @param text - Optional text to display with the spinner
       */
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

      /**
       * Log a main step message to stderr without stopping the spinner.
       * Adds a blank line before the message for visual separation.
       * Aligns with logger.step() to use stderr for status messages.
       */
      step(...args: unknown[]) {
        const text = args[0]
        const { logger } = /*@__PURE__*/ require('./logger.js')
        if (typeof text === 'string') {
          // Add blank line before step for visual separation.
          logger.error('')
          // Use error (stderr) to align with logger.step() default stream.
          logger.error(text, ...args.slice(1))
        }
        return this
      }

      /**
       * Log an indented substep message to stderr without stopping the spinner.
       * Adds 2-space indentation to the message.
       * Aligns with logger.substep() to use stderr for status messages.
       */
      substep(...args: unknown[]) {
        const text = args[0]
        if (typeof text === 'string') {
          // Add 2-space indent for substep.
          const { logger } = /*@__PURE__*/ require('./logger.js')
          // Use error (stderr) to align with logger.substep() default stream.
          logger.error(`  ${text}`, ...args.slice(1))
        }
        return this
      }

      /**
       * Stop the spinner animation and clear internal state.
       * Auto-clears the spinner line via yocto-spinner.stop().
       * Resets progress, shimmer, and text state.
       * @param text - Optional final text to display after stopping
       */
      stop(...args: unknown[]) {
        // Clear internal state.
        this.#baseText = ''
        this.#progress = undefined
        // Reset shimmer animation state if shimmer is enabled.
        if (this.#shimmer) {
          this.#shimmer.currentDir = DIR_LTR
          this.#shimmer.step = 0
        }
        // Call parent stop first (clears screen, sets isSpinning = false).
        const result = this.#apply('stop', args)
        // Then clear text to avoid blank frame render.
        // This is safe now because isSpinning is false.
        super.text = ''
        return result
      }

      /**
       * Show a success message without stopping the spinner.
       * DESIGN DECISION: Unlike yocto-spinner, our success() does NOT stop the spinner.
       * This allows displaying success messages while continuing to spin for multi-step operations.
       * Use successAndStop() if you want to stop the spinner.
       */
      success(...args: unknown[]) {
        return this.#showStatusAndKeepSpinning('success', args)
      }

      /**
       * Show a success message and stop the spinner.
       * Auto-clears the spinner line before displaying the success message.
       */
      successAndStop(...args: unknown[]) {
        return this.#apply('success', args)
      }

      /**
       * Get or set the spinner text.
       * When called with no arguments, returns the current text.
       * When called with text, updates the display and returns the spinner.
       * @param value - Text to display (omit to get current text)
       * @returns Current text (getter) or this spinner (setter)
       */
      text(): string
      text(value: string): Spinner
      text(value?: string): string | Spinner {
        // biome-ignore lint/complexity/noArguments: Function overload for getter/setter pattern.
        if (arguments.length === 0) {
          // Getter: return current base text
          return this.#baseText
        }
        // Setter: update base text and refresh display
        this.#baseText = value ?? ''
        this.#updateSpinnerText()
        return this as unknown as Spinner
      }

      /**
       * Show a warning message without stopping the spinner.
       * Outputs to stderr and continues spinning.
       */
      warn(...args: unknown[]) {
        return this.#showStatusAndKeepSpinning('warn', args)
      }

      /**
       * Show a warning message and stop the spinner.
       * Auto-clears the spinner line before displaying the warning message.
       */
      warnAndStop(...args: unknown[]) {
        return this.#apply('warning', args)
      }

      /**
       * Toggle shimmer effect or update shimmer configuration.
       * Preserves shimmer config when toggling off, allowing easy re-enable.
       * Supports partial config updates to tweak specific properties.
       *
       * @param enabledOrConfig - Boolean to toggle, partial config to update, or direction string
       * @returns This spinner for chaining
       *
       * @example
       * // Toggle off (preserves config for later re-enable)
       * spinner.shimmer(false)
       *
       * // Toggle on (restores saved config or uses defaults)
       * spinner.shimmer(true)
       *
       * // Update specific properties
       * spinner.shimmer({ speed: 0.5 })
       * spinner.shimmer({ color: [255, 0, 0] })
       *
       * // Set direction
       * spinner.shimmer('rtl')
       */
      shimmer(
        enabledOrConfig:
          | boolean
          | Partial<ShimmerConfig>
          | ShimmerDirection
          | undefined,
      ): Spinner {
        if (enabledOrConfig === false) {
          // Disable shimmer but preserve config.
          this.#shimmer = undefined
        } else if (enabledOrConfig === true) {
          // Re-enable with saved config or defaults.
          if (this.#shimmerSavedConfig) {
            // Restore saved config.
            this.#shimmer = { ...this.#shimmerSavedConfig }
          } else {
            // Create default config.
            this.#shimmer = {
              color: COLOR_INHERIT,
              currentDir: DIR_LTR,
              mode: DIR_LTR,
              speed: 1 / 3,
              step: 0,
            } as ShimmerInfo
            this.#shimmerSavedConfig = this.#shimmer
          }
        } else if (typeof enabledOrConfig === 'string') {
          // Direction string - update existing or create new.
          if (this.#shimmer) {
            // Update existing shimmer direction.
            this.#shimmer = {
              ...this.#shimmer,
              mode: enabledOrConfig,
            }
            this.#shimmerSavedConfig = this.#shimmer
          } else if (this.#shimmerSavedConfig) {
            // Restore and update.
            this.#shimmer = {
              ...this.#shimmerSavedConfig,
              mode: enabledOrConfig,
            }
            this.#shimmerSavedConfig = this.#shimmer
          } else {
            // Create new with direction.
            this.#shimmer = {
              color: COLOR_INHERIT,
              currentDir: DIR_LTR,
              mode: enabledOrConfig,
              speed: 1 / 3,
              step: 0,
            } as ShimmerInfo
            this.#shimmerSavedConfig = this.#shimmer
          }
        } else if (enabledOrConfig && typeof enabledOrConfig === 'object') {
          // Partial config update - merge with existing or saved config.
          const partialConfig = {
            __proto__: null,
            ...enabledOrConfig,
          } as Partial<ShimmerConfig>

          if (this.#shimmer) {
            // Update existing shimmer.
            this.#shimmer = {
              ...this.#shimmer,
              ...(partialConfig.color !== undefined
                ? { color: partialConfig.color }
                : {}),
              ...(partialConfig.dir !== undefined
                ? { mode: partialConfig.dir }
                : {}),
              ...(partialConfig.speed !== undefined
                ? { speed: partialConfig.speed }
                : {}),
            } as ShimmerInfo
            this.#shimmerSavedConfig = this.#shimmer
          } else if (this.#shimmerSavedConfig) {
            // Restore and update.
            this.#shimmer = {
              ...this.#shimmerSavedConfig,
              ...(partialConfig.color !== undefined
                ? { color: partialConfig.color }
                : {}),
              ...(partialConfig.dir !== undefined
                ? { mode: partialConfig.dir }
                : {}),
              ...(partialConfig.speed !== undefined
                ? { speed: partialConfig.speed }
                : {}),
            } as ShimmerInfo
            this.#shimmerSavedConfig = this.#shimmer
          } else {
            // Create new with partial config.
            this.#shimmer = {
              color: partialConfig.color ?? COLOR_INHERIT,
              currentDir: DIR_LTR,
              mode: partialConfig.dir ?? DIR_LTR,
              speed: partialConfig.speed ?? 1 / 3,
              step: 0,
            } as ShimmerInfo
            this.#shimmerSavedConfig = this.#shimmer
          }
        }

        this.#updateSpinnerText()
        return this as unknown as Spinner
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
    _defaultSpinner = CI
      ? ciSpinner
      : (getCliSpinners('socket') as SpinnerStyle)
  }
  return new _Spinner({
    spinner: _defaultSpinner,
    ...options,
  })
}

let _spinner: ReturnType<typeof Spinner> | undefined
/**
 * Get the default spinner instance.
 * Lazily creates the spinner to avoid circular dependencies during module initialization.
 */
export function getDefaultSpinner(): ReturnType<typeof Spinner> {
  if (_spinner === undefined) {
    _spinner = Spinner()
  }
  return _spinner
}

/**
 * @deprecated Use `getDefaultSpinner()` function instead for better tree-shaking and to avoid circular dependencies.
 */
export const spinner = /* @__PURE__ */ (() => {
  // Lazy initialization to prevent circular dependency issues during module loading.
  let _lazySpinner: ReturnType<typeof Spinner> | undefined
  return new Proxy({} as ReturnType<typeof Spinner>, {
    get(_target, prop) {
      if (_lazySpinner === undefined) {
        _lazySpinner = Spinner()
      }
      const value = _lazySpinner[prop as keyof ReturnType<typeof Spinner>]
      return typeof value === 'function' ? value.bind(_lazySpinner) : value
    },
  })
})()

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
 *   message: 'Processing…',
 *   operation: async () => {
 *     return await processData()
 *   },
 *   spinner
 * })
 *
 * // Without spinner instance (no-op)
 * await withSpinner({
 *   message: 'Processing…',
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
 * import { spinner, withSpinnerSync} from '@socketsecurity/registry/lib/spinner'
 *
 * const result = withSpinnerSync({
 *   message: 'Processing…',
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
