'use strict'

const {
  IteratorPrototype,
  ReflectApply,
  TypeErrorCtor,
  abruptCloseIterator,
  ensureObject,
  getIteratorDirect
} = require('../shared')

const { reduce: IteratorProtoReduce } = IteratorPrototype
// Based on the specification text:
// https://tc39.es/ecma262/#sec-iterator.prototype.reduce
module.exports =
  typeof IteratorProtoReduce === 'function'
    ? IteratorProtoReduce
    : function reduce(reducer, initialValue) {
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeErrorCtor('`reduce` is not a constructor')
        }
        // Step 1: Let O be the this value.
        const O = this
        // Step 2: If O is not an Object, throw a TypeError exception.
        ensureObject(O)
        // Step 3: If IsCallable(reducer) is false, throw a TypeError exception.
        if (typeof reducer !== 'function') {
          throw new TypeErrorCtor('`reducer` must be a function')
        }
        // Step 4: Let iterated be GetIteratorDirect(O).
        const { iterator, next } = getIteratorDirect(O)
        let accumulator
        let index = 0
        // Step 5: If initialValue is not present,
        if (arguments.length > 1) {
          // Step 6.a: Let accumulator be initialValue.
          accumulator = initialValue
        } else {
          // Step 5.a: Let accumulator be IteratorStepValue(iterated).
          const result = ReflectApply(next, iterator, [])
          // Step 5.b: If accumulator is done, throw a TypeError exception.
          if (result.done) {
            throw new TypeErrorCtor(
              '`reduce` requires an initial value if the iterator is done'
            )
          }
          // Step 5.c: Let counter be 1.
          accumulator = result.value
          index += 1
        }
        // Step 7: Repeat,
        while (true) {
          // Step 7.a: Let value be IteratorStepValue(iterated).
          const result = ReflectApply(next, iterator, [])
          // Step 7.b: If value is done, return accumulator.
          if (result.done) {
            return accumulator
          }
          try {
            // Step 7.c: Let result be Completion(Call(reducer, undefined, << accumulator, value, F(counter) >>)).
            accumulator = ReflectApply(reducer, undefined, [
              accumulator,
              result.value,
              index
            ])
          } catch (e) {
            // Step 7.d: IfAbruptCloseIterator(result, iterated).
            abruptCloseIterator(iterator, e)
          }
          // Step 7.e: Set accumulator to result.
          // Step 7.f: Set counter to counter + 1.
          index += 1
        }
      }
