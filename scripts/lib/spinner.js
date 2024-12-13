'use strict'

const constants = require('@socketregistry/scripts/constants')
const yoctoSpinner = require('@socketregistry/yocto-spinner')

const {
  ENV: { CI }
} = constants

const ciSpinner = {
  frames: [],
  interval: 80
}

function Spinner(options) {
  return yoctoSpinner({
    spinner: CI ? ciSpinner : undefined,
    ...options
  })
}

module.exports = {
  Spinner
}
