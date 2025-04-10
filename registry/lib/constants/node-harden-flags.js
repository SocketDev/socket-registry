'use strict'

const WIN32 = require('./win32')

module.exports = Object.freeze(
  WIN32
    ? []
    : ['--disable-proto', 'throw', '--frozen-intrinsics', '--no-deprecation']
)
