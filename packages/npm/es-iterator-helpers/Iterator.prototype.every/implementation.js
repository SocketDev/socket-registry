'use strict'

const {
  IteratorPrototype,
  ReflectApply,
  TypeErrorCtor,
  abruptCloseIterator,
  closeIterator,
  ensureObject,
  getIteratorDirect
} = require('../shared')

const { every: IteratorProtoEvery } = IteratorPrototype

// Based on the specification text:
// https://tc39.es/ecma262/#sec-iterator.prototype.every
module.exports =
  typeof IteratorProtoEvery === 'function'
    ? IteratorProtoEvery
    : function every(predicate) {
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeErrorCtor('`every` is not a constructor')
        }
        // Step 1: Let O be the this value.
        const O = this
        // Step 2: If O is not an Object, throw a TypeError exception.
        ensureObject(O)
        // Step 3: If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeErrorCtor('`predicate` must be a function')
        }
        // Step 4: Let iterated be GetIteratorDirect(O).
        const { iterator, next } = getIteratorDirect(O)
        // Step 5: Let counter be 0.
        let index = 0
        // Step 6: Repeat,
        while (true) {
          // Step 6.a: Let value be IteratorStepValue(iterated).
          const result = ReflectApply(next, iterator, [])
          // Step 6.b: If value is done, return true.
          if (result.done) {
            return true
          }
          // Step 6.c: Let result be Completion(Call(predicate, undefined, << value, F(counter) >>)).
          let predicateResult
          try {
            predicateResult = ReflectApply(predicate, undefined, [
              result.value,
              index
            ])
          } catch (e) {
            // Step 6.d: IfAbruptCloseIterator(result, iterated).
            abruptCloseIterator(iterator, e)
          }
          // Step 6.e: If ToBoolean(result) is false, return ? IteratorClose(iterated, NormalCompletion(false)).
          if (!predicateResult) {
            return closeIterator(iterator, false)
          }
          // Step 6.f: Set counter to counter + 1.
          index += 1
        }
      }
