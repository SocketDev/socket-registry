'use strict'

const { loading: cliLoadingAnimation } = require('cli-loading-animation')

class Spinner {
  #message
  #options
  #spinner
  constructor(message, options) {
    this.#message = message
    this.#options = { ...options, clearOnEnd: true }
    this.#spinner = cliLoadingAnimation(this.#message, this.#options)
  }

  get message() {
    return this.#message
  }

  set message(text) {
    this.#spinner.stop()
    this.#message = text
    this.#spinner = cliLoadingAnimation(this.#message, this.#options)
  }

  start() {
    this.#spinner.stop()
    this.#spinner.start()
    return this
  }
  stop(...args) {
    this.#spinner.stop()
    if (args.length) {
      console.log(...args)
    }
    return this
  }
}

module.exports = {
  Spinner
}
