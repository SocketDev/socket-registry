'use strict'

const constants = require('./constants')

let _yoctoSpinner
function getYoctoSpinner() {
  if (_yoctoSpinner === undefined) {
    // Load '@socketregistry/yocto-spinner/index.cjs' to avoid the
    // experimental-require-module warning.
    _yoctoSpinner = require('@socketregistry/yocto-spinner/index.cjs')
  }
  return _yoctoSpinner
}

const ciSpinner = {
  frames: [''],
  // The delay argument is converted to a signed 32-bit integer. This effectively
  // limits delay to 2147483647 ms, roughly 24.8 days, since it's specified as a
  // signed integer in the IDL.
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval?utm_source=chatgpt.com#return_value
  interval: 2147483647
}

function Spinner(options) {
  const yoctoSpinner = getYoctoSpinner()
  return yoctoSpinner({
    // Lazily access constants.ENV.
    spinner: constants.ENV.CI ? ciSpinner : undefined,
    ...options
  })
}

module.exports = {
  Spinner
}
