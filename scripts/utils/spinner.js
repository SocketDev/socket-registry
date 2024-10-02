'use strict'

const { loading: cliLoadingAnimation } = require('cli-loading-animation')

const { ENV } = require('@socketregistry/scripts/constants')

function logAsync(...args) {
  return setTimeout(() => console.log(...args), 80)
}

class Spinner {
  #message
  #claOptions
  #spinner
  #spinnerOptions
  #spinning
  constructor(message, options) {
    const { ci = ENV.CI, ...claOptions } = { __proto__: null, ...options }
    this.#claOptions = { __proto__: null, ...claOptions, clearOnEnd: true }
    this.#message = message
    this.#spinnerOptions = { __proto__: null, ci }
    this.#spinner = cliLoadingAnimation(this.#message, this.#claOptions)
  }

  get message() {
    return this.#message
  }

  set message(text) {
    this.#message = text
    if (!this.#spinnerOptions.ci) {
      this.#spinner.stop()
    }
    this.#spinner = cliLoadingAnimation(this.#message, this.#claOptions)
    if (this.#spinnerOptions.ci) {
      logAsync(this.#message)
    } else {
      this.#spinner.start()
    }
  }

  start() {
    if (this.#spinning === false) {
      this.#spinning = true
      if (this.#spinnerOptions.ci) {
        logAsync(this.#message)
      } else {
        this.#spinner.start()
      }
    }
    return this
  }
  stop(...args) {
    if (this.#spinning === true) {
      this.#spinning = false
      if (!this.#spinnerOptions.ci) {
        this.#spinner.stop()
      }
      if (args.length) {
        logAsync(...args)
      }
    }
    return this
  }
}

module.exports = {
  Spinner
}
