'use strict'

const {
  ReflectApply,
  TypeErrorCtor,
  createIteratorFromClosure,
  ensureObject,
  getIteratorDirect,
  ifAbruptCloseIterator,
  setUnderlyingIterator
} = require('../shared')

// Based on https://tc39.es/ecma262/#sec-iterator.prototype.filter.
module.exports = function filter(predicate) {
  // Built-in functions that are not identified as constructors do
  // not implement [[Construct]] unless otherwise specified.
  // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
  if (new.target) {
    throw new TypeErrorCtor('`filter` is not a constructor')
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
  let index = 0
  // Step 5: Let closure be a new Abstract Closure with no parameters that captures iterated and predicate.
  const wrapper = createIteratorFromClosure({
    // Step 5.b: Repeat
    next() {
      while (true) {
        // Step 5.b.i: Let value be IteratorStepValue(iterated).
        const result = ReflectApply(nextMethod, iterator, [])
        // Step 5.b.ii: If value is done, return ReturnCompletion(undefined).
        if (result.done) {
          return result
        }
        let selected
        try {
          // Step 5.b.iii: Let selected be Completion(Call(predicate, undefined, << value, F(counter) >>)).
          selected = predicate(result.value, index++)
        } catch (e) {
          // Step 5.b.iv: IfAbruptCloseIterator(selected, iterated).
          ifAbruptCloseIterator(iterator, e)
        }
        // Step 5.b.v: If ToBoolean(selected) is true,
        if (selected) {
          // Step 5.b.v.1: Let completion be Completion(Yield(value)).
          // Step 5.b.v.2: IfAbruptCloseIterator(completion, iterated).
          return { value: result.value, done: false }
        }
      }
    }
  })
  // Step 7: Set result.[[UnderlyingIterator]] to iterated.
  setUnderlyingIterator(wrapper, iterator)
  // Step 8: Return result.
  return wrapper
}
