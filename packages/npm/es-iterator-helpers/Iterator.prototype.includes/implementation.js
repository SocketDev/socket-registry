'use strict'

const {
  IteratorPrototype,
  NumberIsNaN,
  RangeErrorCtor,
  ReflectApply,
  TypeErrorCtor,
  ensureObject,
  getIteratorDirect,
  ifAbruptCloseIterator,
  iteratorClose,
} = require('../shared')

const { isFinite: NumberIsFinite, isInteger: NumberIsInteger } = Number
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER

const { includes: IteratorProtoIncludes } = IteratorPrototype

// Based on https://tc39.es/ecma262/#sec-iterator.prototype.includes.
module.exports =
  typeof IteratorProtoIncludes === 'function'
    ? IteratorProtoIncludes
    : function includes(searchElement) {
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        if (new.target) {
          throw new TypeErrorCtor('`includes` is not a constructor')
        }
        // If O is not an Object, throw a TypeError exception.
        ensureObject(this)
        // Let toSkip be 0; if a second argument was passed, validate and use
        // it as the number of elements to skip.
        const hasSkippedElements = arguments.length > 1
        const skippedElements = hasSkippedElements ? arguments[1] : undefined
        let toSkip = 0
        if (hasSkippedElements) {
          if (
            typeof skippedElements !== 'number' ||
            NumberIsNaN(skippedElements) ||
            (NumberIsFinite(skippedElements) &&
              !NumberIsInteger(skippedElements))
          ) {
            ifAbruptCloseIterator(
              this,
              new TypeErrorCtor(
                '`skippedElements` must be an integral Number, +Infinity, or -Infinity',
              ),
            )
          }
          toSkip = skippedElements
        }
        if (toSkip < 0) {
          ifAbruptCloseIterator(
            this,
            new RangeErrorCtor('`skippedElements` must be >= 0'),
          )
        }
        if (NumberIsFinite(toSkip) && toSkip > MAX_SAFE_INTEGER) {
          ifAbruptCloseIterator(
            this,
            new RangeErrorCtor('`skippedElements` must be <= 2 ** 53 - 1'),
          )
        }
        const { iterator, next: nextMethod } = getIteratorDirect(this)
        let skipped = 0
        while (true) {
          const result = ReflectApply(nextMethod, iterator, [])
          if (result.done) {
            return false
          }
          const { value } = result
          if (skipped < toSkip) {
            skipped += 1
          } else if (
            value === searchElement ||
            (NumberIsNaN(value) && NumberIsNaN(searchElement))
          ) {
            return iteratorClose(iterator, true)
          }
        }
      }
