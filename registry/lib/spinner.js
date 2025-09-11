'use strict'

const { hasOwn } = /*@__PURE__*/ require('./objects')

const ciSpinner = {
  frames: [''],
  // The delay argument is converted to a signed 32-bit integer. This effectively
  // limits delay to 2147483647 ms, roughly 24.8 days, since it's specified as a
  // signed integer in the IDL.
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval?utm_source=chatgpt.com#return_value
  interval: 2147483647
}

function desc(value) {
  return {
    __proto__: null,
    configurable: true,
    value,
    writable: true
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trimStart() : ''
}

let _cliSpinners
/*@__NO_SIDE_EFFECTS__*/
function getCliSpinners(styleName) {
  if (_cliSpinners === undefined) {
    const yoctoFactory = /*@__PURE__*/ require('../external/@socketregistry/yocto-spinner')
    const { constructor: YoctoCtor } = yoctoFactory()
    _cliSpinners = YoctoCtor.spinners
  }
  if (typeof styleName === 'string') {
    return hasOwn(_cliSpinners, styleName) ? _cliSpinners[styleName] : undefined
  }
  return _cliSpinners
}

let _Spinner
let _defaultSpinner
/*@__NO_SIDE_EFFECTS__*/
function Spinner(options) {
  if (_Spinner === undefined) {
    const ENV = /*@__PURE__*/ require('./constants/env')
    const abortSignal = /*@__PURE__*/ require('./constants/abort-signal')
    const { isBlankString } = /*@__PURE__*/ require('./strings')
    const yoctoFactory = /*@__PURE__*/ require('../external/@socketregistry/yocto-spinner')
    const { constructor: YoctoCtor } = yoctoFactory()

    /*@__PURE__*/
    _Spinner = class Spinner extends YoctoCtor {
      constructor(options) {
        super({
          signal: abortSignal,
          ...options
        })
      }

      #apply(methodName, args) {
        let extras
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
          logger
        } = /*@__PURE__*/ require('./logger')
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

      #applyAndKeepSpinning(methodName, args) {
        const wasSpinning = this.isSpinning
        this.#apply(methodName, args)
        if (wasSpinning) {
          this.start()
        }
        return this
      }

      debug(...args) {
        const { isDebug } = /*@__PURE__*/ require('./debug')
        if (isDebug()) {
          return this.#applyAndKeepSpinning('info', args)
        }
        return this
      }

      debugAndStop(...args) {
        const { isDebug } = /*@__PURE__*/ require('./debug')
        if (isDebug()) {
          return this.#apply('info', args)
        }
        return this
      }

      fail(...args) {
        return this.#applyAndKeepSpinning('error', args)
      }

      failAndStop(...args) {
        return this.#apply('error', args)
      }

      getText() {
        return this.text
      }

      info(...args) {
        return this.#applyAndKeepSpinning('info', args)
      }

      infoAndStop(...args) {
        return this.#apply('info', args)
      }

      log(...args) {
        return this.#applyAndKeepSpinning('stop', args)
      }

      logAndStop(...args) {
        return this.#apply('stop', args)
      }

      setText(value) {
        this.text = normalizeText(value)
        return this
      }

      start(...args) {
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

      stop(...args) {
        // We clear this.text on stop because yocto-spinner will not clear it.
        this.setText('')
        return this.#apply('stop', args)
      }

      success(...args) {
        return this.#applyAndKeepSpinning('success', args)
      }

      successAndStop(...args) {
        return this.#apply('success', args)
      }

      warn(...args) {
        return this.#applyAndKeepSpinning('warning', args)
      }

      warnAndStop(...args) {
        return this.#apply('warning', args)
      }
    }
    // Add aliases.
    Object.defineProperties(_Spinner.prototype, {
      error: desc(_Spinner.prototype.fail),
      errorAndStop: desc(_Spinner.prototype.failAndStop),
      warning: desc(_Spinner.prototype.warn),
      warningAndStop: desc(_Spinner.prototype.warnAndStop)
    })
    _defaultSpinner = ENV.CI ? ciSpinner : undefined
  }
  return new _Spinner({
    spinner: _defaultSpinner,
    ...options
  })
}

module.exports = {
  getCliSpinners,
  Spinner
}
