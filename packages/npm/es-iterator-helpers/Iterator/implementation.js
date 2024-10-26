'use strict'

const { IteratorCtor, IteratorPrototype, TypeErrorCtor } = require('../shared')

// Based on specification text:
// https://tc39.es/ecma262/#sec-iterator-constructor
module.exports =
  typeof IteratorCtor === 'function'
    ? IteratorCtor
    : Object.defineProperty(
        function Iterator() {
          // Step 1: If NewTarget is either undefined or the active function object,
          // throw a TypeError exception.
          if (!new.target || this.constructor === Iterator) {
            throw new TypeErrorCtor(
              '`Iterator` cannot be called or constructed directly'
            )
          }
          // Step 2: Return OrdinaryCreateFromConstructor(NewTarget, "%Iterator.prototype%").
        },
        'prototype',
        {
          __proto__: null,
          value: IteratorPrototype,
          writable: false // Prevents modification of the prototype.
        }
      )
