'use strict'

const { isPrototypeOf: objIsPrototypeOf } = Object.prototype

module.exports =
  Iterator ??
  (() => {
    const IteratorPrototype = require('../Iterator.prototype/implementation')
    return Object.defineProperty(
      function Iterator() {
        if (
          !(this instanceof Iterator) ||
          this.constructor === Iterator ||
          !objIsPrototypeOf.call(Iterator, this.constructor)
        ) {
          throw new TypeError(
            '`Iterator` can not be called or constructed directly'
          )
        }
      },
      'prototype',
      {
        __proto__: null,
        value: IteratorPrototype,
        writable: false
      }
    )
  })()
