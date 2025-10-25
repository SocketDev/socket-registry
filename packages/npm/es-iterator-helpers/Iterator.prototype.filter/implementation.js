'use strict'

const {
  ReflectApply,
  TypeErrorCtor,
  createIteratorFromClosure,
  ensureObject,
  getIteratorDirect,
  ifAbruptCloseIterator,
  setUnderlyingIterator,
} = require('../shared')

// Based on https://tc39.es/ecma262/#sec-iterator.prototype.filter.
module.exports = function filter(predicate) {
  // Step 1: Let O be the this value.
  // Built-in functions that are not identified as constructors do
  // not implement [[Construct]] unless otherwise specified.
  // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
  if (new.target) {
    throw new TypeErrorCtor('`filter` is not a constructor')
  }
  // Step 2: If O is not an Object, throw a TypeError exception.
  ensureObject(this)
  // Step 3: If IsCallable(predicate) is false, throw a TypeError exception.
  if (typeof predicate !== 'function') {
    throw new TypeErrorCtor('`predicate` must be a function')
  }
  // Step 4: Let iterated be ? GetIteratorDirect(O).
  const { iterator, next: nextMethod } = getIteratorDirect(this)
  // Step 5: Let closure be a new Abstract Closure with no parameters that captures iterated and predicate and performs the following steps when called:
  // Step 5.a: Let counter be 0.
  let index = 0
  const wrapper = createIteratorFromClosure({
    next() {
      // Step 5.b: Repeat,
      while (true) {
        // Step 5.b.i: Let value be ? IteratorStepValue(iterated).
        const result = ReflectApply(nextMethod, iterator, [])
        // Step 5.b.ii: If value is done, return undefined.
        if (result.done) {
          return result
        }
        let selected
        try {
          // Step 5.b.iii: Let selected be Completion(Call(predicate, undefined, « value, 𝔽(counter) »)).
          selected = predicate(result.value, index++)
        } catch (e) {
          // Step 5.b.iv: IfAbruptCloseIterator(selected, iterated).
          ifAbruptCloseIterator(iterator, e)
        }
        // Step 5.b.v: If ToBoolean(selected) is true, then
        if (selected) {
          // Step 5.b.v.1: Let completion be Completion(Yield(value)).
          // Step 5.b.v.2: IfAbruptCloseIterator(completion, iterated).
          return { value: result.value, done: false }
        }
        // Step 5.b.vi: Set counter to counter + 1.
        // (Handled by post-increment in step 5.b.iii)
      }
    },
  })
  // Step 6: Let result be ? CreateIteratorFromClosure(closure, "Iterator Helper", %IteratorHelperPrototype%, « [[UnderlyingIterator]] »).
  // Step 7: Set result.[[UnderlyingIterator]] to iterated.
  setUnderlyingIterator(wrapper, iterator)
  // Step 8: Return result.
  return wrapper
}
