'use strict'

const ciSpinner = {
  frames: [''],
  // The delay argument is converted to a signed 32-bit integer. This effectively
  // limits delay to 2147483647 ms, roughly 24.8 days, since it's specified as a
  // signed integer in the IDL.
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval?utm_source=chatgpt.com#return_value
  interval: 2147483647
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
        const { isSpinning: wasSpinning } = this
        super[methodName](text)
        const {
          incLogCallCountSymbol,
          lastWasBlankSymbol,
          logger
        } = /*@__PURE__*/ require('./logger')
        if (methodName === 'stop') {
          if (wasSpinning && text) {
            logger[lastWasBlankSymbol](isBlankString(text))
          }
        } else {
          logger[lastWasBlankSymbol](false)
        }
        logger[incLogCallCountSymbol]()
        if (extras.length) {
          logger.log(...extras)
          logger[lastWasBlankSymbol](false)
        }
        return this
      }

      #applyAndKeepSpinning(methodName, args) {
        const { isSpinning } = this
        this.#apply(methodName, args)
        if (isSpinning) {
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

      setText(text) {
        this.text = text ?? ''
        return this
      }

      start(...args) {
        return this.#apply('start', args)
      }

      stop(...args) {
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
    _Spinner.prototype.error = _Spinner.prototype.fail
    _Spinner.prototype.errorAndStop = _Spinner.prototype.failAndStop
    _Spinner.prototype.warning = _Spinner.prototype.warn
    _Spinner.prototype.warningAndStop = _Spinner.prototype.warnAndStop

    _defaultSpinner = ENV.CI ? ciSpinner : undefined
  }
  return new _Spinner({
    spinner: _defaultSpinner,
    ...options
  })
}

module.exports = {
  Spinner
}
