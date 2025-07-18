'use strict'

const { freeze: ObjectFreeze } = Object

const WIN32 = require('./win32')

module.exports = ObjectFreeze(
  WIN32
    ? ['--disallow-code-generation-from-strings']
    : [
        // https://nodejs.org/api/cli.html#--disable-protomode
        '--disable-proto',
        'throw',
        // https://nodejs.org/api/cli.html#--disallow-code-generation-from-strings
        '--disallow-code-generation-from-strings',
        // https://nodejs.org/api/cli.html#--frozen-intrinsics
        '--frozen-intrinsics',
        // https://nodejs.org/api/cli.html#--no-deprecation
        '--no-deprecation'
      ]
)
