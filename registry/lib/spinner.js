'use strict'

const constants = require('./constants')

const ciSpinner = {
  frames: [''],
  // The delay argument is converted to a signed 32-bit integer. This effectively
  // limits delay to 2147483647 ms, roughly 24.8 days, since it's specified as a
  // signed integer in the IDL.
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval?utm_source=chatgpt.com#return_value
  interval: 2147483647
}

let _spinnerFactory
function getSpinnerFactory() {
  if (_spinnerFactory === undefined) {
    // Load '@socketregistry/yocto-spinner/index.cjs' to avoid the
    // experimental-require-module warning.
    const yoctoFactory = require('@socketregistry/yocto-spinner/index.cjs')
    const { constructor: YoctoCtor } = yoctoFactory()
    class Spinner extends YoctoCtor {
      error(...args) {
        return this.#applyAndKeepSpinning('error', args)
      }

      errorAndStop(...args) {
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
        this.text = text
        return this
      }

      start(...args) {
        let text = args.at(0) ?? ''
        if (typeof text !== 'string' || args.length > 1) {
          text = ''
          console.log(...args)
        }
        return super.start(text)
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

      #apply(methodName, ...args) {
        let extras
        let text = args.at(0) ?? ''
        if (typeof text !== 'string') {
          text = ''
          extras = args
        } else {
          extras = args.slice(1)
        }
        const result = super[methodName](text)
        if (extras.length) {
          console.log(extras)
        }
        return result
      }

      #applyAndKeepSpinning(methodName, ...args) {
        const { isSpinning } = this
        const result = this.#apply(methodName, args)
        if (isSpinning) {
          this.start()
        }
        return result
      }
    }
    Spinner.prototype.warning = Spinner.prototype.warn
    Spinner.prototype.warningAndStop = Spinner.prototype.warnAndStop
    _spinnerFactory = function spinnerFactory(options) {
      return new Spinner(options)
    }
  }
  return _spinnerFactory
}

function Spinner(options) {
  const spinnerFactory = getSpinnerFactory()
  return spinnerFactory({
    // Lazily access constants.ENV.
    spinner: constants.ENV.CI ? ciSpinner : undefined,
    ...options
  })
}

module.exports = {
  Spinner
}
