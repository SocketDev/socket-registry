'use strict'

const {
  IteratorPrototype,
  NumberCtor,
  NumberIsNaN,
  RangeErrorCtor,
  ReflectApply,
  TypeErrorCtor,
  closeIterator,
  createIteratorFromClosure,
  ensureObject,
  getIteratorDirect,
  setUnderlyingIterator,
  toIntegerOrInfinity
} = require('../shared')

const { take: IteratorProtoTake } = IteratorPrototype

// Based on the specification text:
// https://tc39.es/ecma262/#sec-iterator.prototype.take
module.exports =
  typeof IteratorProtoTake === 'function'
    ? IteratorProtoTake
    : function take(limit) {
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeErrorCtor('`Iterator.take` is not a constructor')
        }
        // Step 1: Let O be the this value.
        const O = this
        // Step 2: If O is not an Object, throw a TypeError exception.
        ensureObject(O)
        // Step 3: Let numLimit be ToNumber(limit).
        const numLimit = NumberCtor(limit)
        // Step 5: Let integerLimit be ! ToIntegerOrInfinity(numLimit).
        const integerLimit = toIntegerOrInfinity(numLimit)
        // Step 4: If numLimit is NaN, throw a RangeError exception.
        // Step 6: If integerLimit < 0, throw a RangeError exception.
        if (NumberIsNaN(numLimit) || integerLimit < 0) {
          throw new RangeErrorCtor('`limit` must be a non-negative number')
        }
        // Step 7: Let iterated be GetIteratorDirect(O).
        const { iterator, next } = getIteratorDirect(O)
        // Step 8.a: Let remaining be integerLimit.
        let remaining = integerLimit
        // Step 8: Let closure be a new Abstract Closure with no parameters that captures iterated and integerLimit.
        const wrapper = createIteratorFromClosure({
          next() {
            // Step 8.b.i: If remaining = 0, then return IteratorClose(iterated, ReturnCompletion(undefined)).
            if (remaining === 0) {
              closeIterator(iterator, undefined)
              return { value: undefined, done: true }
            }
            // Step 8.b.iii: Let value be IteratorStepValue(iterated).
            const result = ReflectApply(next, iterator, [])
            // Step 8.b.iv: If value is done, return ReturnCompletion(undefined).
            if (result.done) {
              return result
            }
            // Step 8.b.ii: If remaining !== +Infinity, set remaining to remaining - 1.
            if (remaining !== Infinity) {
              remaining -= 1
            }
            // Step 8.b.v: Return the value yielded by the iterator.
            return result
          }
        })
        // Step 10: Set result.[[UnderlyingIterator]] to iterated.
        setUnderlyingIterator(wrapper, iterator)
        // Step 11: Return result.
        return wrapper
      }
