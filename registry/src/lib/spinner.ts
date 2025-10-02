/**
 * @fileoverview CLI spinner utilities for long-running operations.
 * Provides animated progress indicators with CI environment detection.
 */

import ENV from './constants/ENV'
import abortSignal from './constants/abort-signal'
import { isBlankString } from './strings'
import yoctoSpinnerFactory from '../external/@socketregistry/yocto-spinner'

import type { Writable } from 'node:stream'

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ObjectHasOwn = Object.hasOwn

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

export type SpinnerStyle = {
  readonly frames: string[]
  readonly interval?: number | undefined
}

export type SpinnerOptions = {
  readonly color?: Color | undefined
  readonly spinner?: SpinnerStyle | undefined
  readonly signal?: AbortSignal | undefined
  readonly stream?: Writable | undefined
  readonly text?: string | undefined
}

export type Spinner = {
  color: Color
  text: string
  spinner: SpinnerStyle

  get isSpinning(): boolean

  clear(): Spinner
  debug(text?: string | undefined, ...extras: any[]): Spinner
  debugAndStop(text?: string | undefined, ...extras: any[]): Spinner
  error(text?: string | undefined, ...extras: any[]): Spinner
  errorAndStop(text?: string | undefined, ...extras: any[]): Spinner
  fail(text?: string | undefined, ...extras: any[]): Spinner
  failAndStop(text?: string | undefined, ...extras: any[]): Spinner

  getText(): string
  setText(text?: string | undefined): Spinner
  indent(spaces?: number | undefined): Spinner
  dedent(spaces?: number | undefined): Spinner
  resetIndent(): Spinner

  info(text?: string | undefined, ...extras: any[]): Spinner
  infoAndStop(text?: string | undefined, ...extras: any[]): Spinner
  log(text?: string | undefined, ...extras: any[]): Spinner
  logAndStop(text?: string | undefined, ...extras: any[]): Spinner

  start(text?: string | undefined): Spinner
  stop(text?: string | undefined): Spinner
  stopAndPersist(text?: string | undefined): Spinner

  success(text?: string | undefined, ...extras: any[]): Spinner
  successAndStop(text?: string | undefined, ...extras: any[]): Spinner

  warn(text?: string | undefined, ...extras: any[]): Spinner
  warnAndStop(text?: string | undefined, ...extras: any[]): Spinner
}

export const ciSpinner: SpinnerStyle = {
  frames: [''],
  interval: 2147483647,
}

function desc(value: any) {
  return {
    __proto__: null,
    configurable: true,
    value,
    writable: true,
  }
}

function normalizeText(value: any) {
  return typeof value === 'string' ? value.trimStart() : ''
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
    const yoctoFactory = /*@__PURE__*/ require('../external/@socketregistry/yocto-spinner')
    const { constructor: YoctoCtor } = yoctoFactory()
    _cliSpinners = YoctoCtor.spinners
  }
  if (typeof styleName === 'string' && _cliSpinners) {
    return ObjectHasOwn(_cliSpinners, styleName)
      ? _cliSpinners[styleName]
      : undefined
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
    const { constructor: YoctoCtor } = yoctoSpinnerFactory()

    /*@__PURE__*/
    _Spinner = class SpinnerClass extends (YoctoCtor as any) {
      declare isSpinning: boolean
      declare text: string
      constructor(options?: SpinnerOptions | undefined) {
        // eslint-disable-next-line constructor-super
        super({
          signal: abortSignal,
          ...options,
        })
      }

      #apply(methodName: string, args: any[]) {
        let extras: any[]
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

      #applyAndKeepSpinning(methodName: string, args: any[]) {
        const wasSpinning = this.isSpinning
        this.#apply(methodName, args)
        if (wasSpinning) {
          this.start()
        }
        return this
      }

      debug(...args: any[]) {
        const { isDebug } = /*@__PURE__*/ require('./debug.js')
        if (isDebug()) {
          return this.#applyAndKeepSpinning('info', args)
        }
        return this
      }

      debugAndStop(...args: any[]) {
        const { isDebug } = /*@__PURE__*/ require('./debug.js')
        if (isDebug()) {
          return this.#apply('info', args)
        }
        return this
      }

      fail(...args: any[]) {
        return this.#applyAndKeepSpinning('error', args)
      }

      failAndStop(...args: any[]) {
        return this.#apply('error', args)
      }

      getText() {
        return this.text
      }

      info(...args: any[]) {
        return this.#applyAndKeepSpinning('info', args)
      }

      infoAndStop(...args: any[]) {
        return this.#apply('info', args)
      }

      log(...args: any[]) {
        return this.#applyAndKeepSpinning('stop', args)
      }

      logAndStop(...args: any[]) {
        return this.#apply('stop', args)
      }

      setText(value: any) {
        this.text = normalizeText(value)
        return this
      }

      start(...args: any[]) {
        if (args.length) {
          const text = args.at(0)
          const normalized = normalizeText(text)
          // We clear this.text on start when `text` is falsy because yocto-spinner
          // will not clear it otherwise.
          if (!normalized) {
            this.setText('')
          }
        }
        return this.#apply('start', args)
      }

      stop(...args: any[]) {
        // We clear this.text on stop because yocto-spinner will not clear it.
        this.setText('')
        return this.#apply('stop', args)
      }

      success(...args: any[]) {
        return this.#applyAndKeepSpinning('success', args)
      }

      successAndStop(...args: any[]) {
        return this.#apply('success', args)
      }

      warn(...args: any[]) {
        return this.#applyAndKeepSpinning('warning', args)
      }

      warnAndStop(...args: any[]) {
        return this.#apply('warning', args)
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
