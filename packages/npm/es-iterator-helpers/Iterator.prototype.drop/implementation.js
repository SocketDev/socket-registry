'use strict'

const {
  NumberCtor,
  NumberIsNaN,
  RangeErrorCtor,
  ReflectApply,
  TypeErrorCtor,
  createIteratorFromClosure,
  ensureObject,
  getIteratorDirect,
  setUnderlyingIterator,
  toIntegerOrInfinity
} = require('../shared')

// Based specification text:
// https://tc39.es/ecma262/#sec-iterator.prototype.drop
module.exports = function drop(limit) {
  // ECMAScript Standard Built-in Objects
  // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
  // Built-in function objects that are not identified as constructors do
  // not implement the [[Construct]] internal method unless otherwise
  // specified in the description of a particular function.
  if (new.target) {
    throw new TypeErrorCtor('`drop` is not a constructor')
  }
  // Step 1: Let O be the this value.
  const O = this
  // Step 2: If O is not an Object, throw a TypeError exception.
  ensureObject(O)
  // Step 3: Let numLimit be ToNumber(limit).
  // Step 4: If numLimit is NaN, throw a RangeError exception.
  const numLimit = NumberCtor(limit)
  if (NumberIsNaN(numLimit)) {
    throw new RangeErrorCtor('`limit` must not be NaN')
  }
  // Step 5. Let integerLimit be ToIntegerOrInfinity(numLimit)
  const integerLimit = toIntegerOrInfinity(numLimit)
  // Step 6: If integerLimit < 0, throw a RangeError exception.
  if (integerLimit < 0) {
    throw new RangeErrorCtor('`limit` must be a non-negative number')
  }
  // Step 7: Let iterated be GetIteratorDirect(O).
  const { iterator, next } = getIteratorDirect(O)
  // Step 8.a: Let remaining be integerLimit.
  let remaining = integerLimit
  // Step 8: Let closure be a new Abstract Closure with no parameters that captures iterated and integerLimit.
  const wrapper = createIteratorFromClosure({
    next() {
      // Step 8.b: Repeat, while remaining > 0
      while (remaining > 0) {
        // Step 8.b.i: If remaining !== +Infinity, decrement remaining.
        if (remaining !== Infinity) {
          // Step 8.b.i.1: Set remaining to remaining - 1
          remaining -= 1
        }
        // Step 8.b.ii: Let next be IteratorStep(iterated).
        const result = ReflectApply(next, iterator, [])
        // Step 8.b.iii: If next is done, return ReturnCompletion(undefined).
        if (result.done) {
          return result
        }
      }
      // Step 8.c: Repeat, yield the remaining values.
      return ReflectApply(next, iterator, [])
    }
  })
  // Step 10: Set result.[[UnderlyingIterator]] to iterated.
  setUnderlyingIterator(wrapper, iterator)
  // Step 11: Return result.
  return wrapper
}
