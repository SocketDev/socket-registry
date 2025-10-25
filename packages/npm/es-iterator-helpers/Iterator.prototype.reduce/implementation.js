'use strict'

const {
  IteratorPrototype,
  ReflectApply,
  TypeErrorCtor,
  ensureObject,
  getIteratorDirect,
  ifAbruptCloseIterator,
} = require('../shared')

const { reduce: IteratorProtoReduce } = IteratorPrototype

// Based on https://tc39.es/ecma262/#sec-iterator.prototype.reduce.
module.exports =
  typeof IteratorProtoReduce === 'function'
    ? IteratorProtoReduce
    : function reduce(reducer, initialValue) {
        // Step 1: Let O be the this value.
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeErrorCtor('`reduce` is not a constructor')
        }
        // Step 2: If O is not an Object, throw a TypeError exception.
        ensureObject(this)
        // Step 3: If IsCallable(reducer) is false, throw a TypeError exception.
        if (typeof reducer !== 'function') {
          throw new TypeErrorCtor('`reducer` must be a function')
        }
        // Step 4: Let iterated be ? GetIteratorDirect(O).
        const { iterator, next: nextMethod } = getIteratorDirect(this)
        let accumulator
        let index = 0
        // Step 5: If initialValue is not present, then
        if (arguments.length > 1) {
          // Step 6: Else,
          // Step 6.a: Let accumulator be initialValue.
          accumulator = initialValue
          // Step 6.b: Let counter be 0.
          // (Already 0)
        } else {
          // Step 5.a: Let accumulator be ? IteratorStepValue(iterated).
          const result = ReflectApply(nextMethod, iterator, [])
          // Step 5.b: If accumulator is done, throw a TypeError exception.
          if (result.done) {
            throw new TypeErrorCtor(
              '`reduce` requires an initial value if the iterator is done',
            )
          }
          // Step 5.c: Let counter be 1.
          accumulator = result.value
          index += 1
        }
        // Step 7: Repeat,
        while (true) {
          // Step 7.a: Let value be ? IteratorStepValue(iterated).
          const result = ReflectApply(nextMethod, iterator, [])
          // Step 7.b: If value is done, return accumulator.
          if (result.done) {
            return accumulator
          }
          try {
            // Step 7.c: Let result be Completion(Call(reducer, undefined, « accumulator, value, 𝔽(counter) »)).
            accumulator = ReflectApply(reducer, undefined, [
              accumulator,
              result.value,
              index,
            ])
          } catch (e) {
            // Step 7.d: IfAbruptCloseIterator(result, iterated).
            ifAbruptCloseIterator(iterator, e)
          }
          // Step 7.e: Set accumulator to result.
          // (Already done in step 7.c assignment)
          // Step 7.f: Set counter to counter + 1.
          index += 1
        }
      }
