'use strict'

const {
  IteratorPrototype,
  ReflectApply,
  TypeErrorCtor,
  ensureObject,
  getIteratorDirect,
  ifAbruptCloseIterator,
  iteratorClose
} = require('../shared')

const { some: IteratorProtoSome } = IteratorPrototype

// Based on https://tc39.es/ecma262/#sec-iterator.prototype.some.
module.exports =
  typeof IteratorProtoSome === 'function'
    ? IteratorProtoSome
    : function some(predicate) {
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeErrorCtor('`some` is not a constructor')
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
        const { iterator, next: nextMethod } = getIteratorDirect(O)
        // Step 5: Let counter be 0.
        let index = 0
        // Step 6: Repeat
        while (true) {
          // Step 6.a: Let value be IteratorStepValue(iterated).
          const result = ReflectApply(nextMethod, iterator, [])
          // Step 6.b: If value is done, return false.
          if (result.done) {
            return false
          }
          let predicateResult
          try {
            // Step 6.c: Let result be Completion(Call(predicate, undefined,<< value, F(counter) >>)).
            predicateResult = ReflectApply(predicate, undefined, [
              result.value,
              index
            ])
          } catch (e) {
            // Step 6.d: IfAbruptCloseIterator(result, iterated).
            ifAbruptCloseIterator(iterator, e)
          }
          // Step 6.e: If ToBoolean(result) is true, return IteratorClose(iterated, NormalCompletion(true)).
          if (predicateResult) {
            return iteratorClose(iterator, true)
          }
          // Step 6.f: Set counter to counter + 1.
          index += 1
        }
      }
