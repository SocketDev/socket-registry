'use strict'

const WIN32 = /*@__PURE__*/ require('./win32')

module.exports = new Map([
  [
    'npm',
    new Set([
      // @hyrious/bun.lockb has no unit tests.
      // https://github.com/hyrious/bun.lockb/tree/v0.0.4
      '@hyrious/bun.lockb',
      'hyrious__bun.lockb',
      // Our array-flatten override supports v1, v2, and v3 APIs, so we handle
      // testing ourselves.
      'array-flatten',
      // date tests fail for some Node versions and platforms, but pass in CI
      // Win32 environments for the time being.
      // https://github.com/es-shims/Date/issues/3
      // https://github.com/es-shims/Date/tree/v2.0.5
      // Lazily access constants.ENV.
      ...(WIN32 ? [] : ['date']),
      // es6-object-assign has no unit tests.
      // https://github.com/rubennorte/es6-object-assign/tree/v1.1.0
      'es6-object-assign',
      // harmony-reflect has known failures in its package and requires running
      // tests in browser.
      // https://github.com/tvcutsem/harmony-reflect/tree/v1.6.2/test
      'harmony-reflect',
      // is-regex tests don't account for `is-regex` backed by
      // `require('node:util/types).isRegExp` which triggers no proxy traps and
      // assumes instead that the 'getOwnPropertyDescriptor' trap will be triggered
      // by `Object.getOwnPropertyDescriptor(value, 'lastIndex')`.
      // https://github.com/inspect-js/is-regex/issues/35
      // https://github.com/inspect-js/is-regex/blob/v1.1.4/test/index.js
      'is-regex',
      // safer-buffer tests assume Buffer.alloc, Buffer.allocUnsafe, and
      // Buffer.allocUnsafeSlow throw for a size of 2 * (1 << 30), i.e. 2147483648,
      // which is no longer the case.
      // https://github.com/ChALkeR/safer-buffer/issues/16
      // https://github.com/ChALkeR/safer-buffer/blob/v2.1.2/tests.js
      'safer-buffer'
    ])
  ]
])
