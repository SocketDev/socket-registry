'use strict'

const {
  IteratorPrototype,
  ReflectApply,
  TypeErrorCtor,
  abruptCloseIterator,
  ensureObject,
  getIteratorDirect
} = require('../shared')

const { forEach: IteratorProtoForEach } = IteratorPrototype

// Based on the specification text:
// https://tc39.es/ecma262/#sec-iterator.prototype.foreach
module.exports =
  typeof IteratorProtoForEach === 'function'
    ? IteratorProtoForEach
    : function forEach(procedure) {
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeErrorCtor('`forEach` is not a constructor')
        }
        // Step 1: Let O be the this value.
        const O = this
        // Step 2: If O is not an Object, throw a TypeError exception.
        ensureObject(O)
        // Step 3: If IsCallable(procedure) is false, throw a TypeError exception.
        if (typeof procedure !== 'function') {
          throw new TypeErrorCtor('`procedure` must be a function')
        }
        // Step 4: Let iterated be GetIteratorDirect(O).
        const { iterator, next } = getIteratorDirect(O)
        // Step 5: Let counter be 0.
        let index = 0
        // Step 6: Repeat,
        while (true) {
          // Step 6.a: Let value be IteratorStepValue(iterated).
          const result = ReflectApply(next, iterator, [])
          // Step 6.b: If value is done, return undefined.
          if (result.done) {
            return
          }
          try {
            // Step 6.c: Let result be Completion(Call(procedure, undefined, << value, F(counter) >>)).
            ReflectApply(procedure, undefined, [result.value, index])
          } catch (e) {
            // Step 6.d: IfAbruptCloseIterator(result, iterated).
            abruptCloseIterator(iterator, e)
          }
          // Step 6.e: Set counter to counter + 1.
          index += 1
        }
      }
