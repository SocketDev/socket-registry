'use strict'

const {
  IteratorPrototype,
  NumberCtor,
  NumberIsNaN,
  RangeErrorCtor,
  ReflectApply,
  TypeErrorCtor,
  createIteratorFromClosure,
  ensureObject,
  getIteratorDirect,
  iteratorClose,
  setUnderlyingIterator,
  toIntegerOrInfinity,
} = require('../shared')

const { take: IteratorProtoTake } = IteratorPrototype

// Based on https://tc39.es/ecma262/#sec-iterator.prototype.take.
module.exports =
  typeof IteratorProtoTake === 'function'
    ? IteratorProtoTake
    : function take(limit) {
        // Step 1: Let O be the this value.
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeErrorCtor('`Iterator.take` is not a constructor')
        }
        // Step 2: If O is not an Object, throw a TypeError exception.
        ensureObject(this)
        // Step 3: Let numLimit be ToNumber(limit).
        const numLimit = NumberCtor(limit)
        // Step 5: Let integerLimit be ! ToIntegerOrInfinity(numLimit).
        const integerLimit = toIntegerOrInfinity(numLimit)
        // Step 4: If numLimit is NaN, throw a RangeError exception.
        // Step 6: If integerLimit < 0, throw a RangeError exception.
        if (NumberIsNaN(numLimit) || integerLimit < 0) {
          throw new RangeErrorCtor('`limit` must be a non-negative number')
        }
        // Step 7: Let iterated be ? GetIteratorDirect(O).
        const { iterator, next: nextMethod } = getIteratorDirect(this)
        // Step 8: Let closure be a new Abstract Closure with no parameters that captures iterated and integerLimit and performs the following steps when called:
        // Step 8.a: Let remaining be integerLimit.
        let remaining = integerLimit
        const wrapper = createIteratorFromClosure({
          next() {
            // Step 8.b: Repeat,
            // Step 8.b.i: If remaining is 0, then
            if (remaining === 0) {
              // Step 8.b.i.1: Return ? IteratorClose(iterated, NormalCompletion(undefined)).
              iteratorClose(iterator, undefined)
              return { value: undefined, done: true }
            }
            // Step 8.b.ii: If remaining is not +∞, then
            // Step 8.b.ii.1: Set remaining to remaining - 1.
            // (Done after getting value to pass correct index)
            // Step 8.b.iii: Let value be ? IteratorStepValue(iterated).
            const result = ReflectApply(nextMethod, iterator, [])
            // Step 8.b.iv: If value is done, return undefined.
            if (result.done) {
              return result
            }
            // Step 8.b.ii: If remaining is not +∞, then
            if (remaining !== Number.POSITIVE_INFINITY) {
              // Step 8.b.ii.1: Set remaining to remaining - 1.
              remaining -= 1
            }
            // Step 8.b.v: Let completion be Completion(Yield(value)).
            // Step 8.b.vi: IfAbruptCloseIterator(completion, iterated).
            return result
          },
        })
        // Step 9: Let result be ? CreateIteratorFromClosure(closure, "Iterator Helper", %IteratorHelperPrototype%, « [[UnderlyingIterator]] »).
        // Step 10: Set result.[[UnderlyingIterator]] to iterated.
        setUnderlyingIterator(wrapper, iterator)
        // Step 11: Return result.
        return wrapper
      }
