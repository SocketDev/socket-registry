'use strict'

const {
  ReflectApply,
  TypeErrorCtor,
  abruptCloseIterator,
  createIteratorFromClosure,
  ensureObject,
  getIteratorDirect,
  setUnderlyingIterator
} = require('../shared')

// Based on the specification text:
// https://tc39.es/ecma262/#sec-iterator.prototype.map
module.exports = function map(mapper) {
  // Built-in functions that are not identified as constructors do
  // not implement [[Construct]] unless otherwise specified.
  // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
  if (new.target) {
    throw new TypeErrorCtor('`Iterator.map` is not a constructor')
  }
  // Step 1: Let O be the this value.
  const O = this
  // Step 2: If O is not an Object, throw a TypeError exception.
  ensureObject(O)
  // Step 3: If IsCallable(mapper) is false, throw a TypeError exception.
  if (typeof mapper !== 'function') {
    throw new TypeErrorCtor('`mapper` must be a function')
  }
  // Step 4: Let iterated be GetIteratorDirect(O).
  const { iterator, next } = getIteratorDirect(O)
  // Step 5: Let closure be a new Abstract Closure with no parameters that
  // captures iterated and mapper.
  let index = 0
  const wrapper = createIteratorFromClosure({
    // Step 5.b: Repeat
    next() {
      // Step 5.b.i: Let value be IteratorStepValue(iterated).
      const result = ReflectApply(next, iterator, [])
      // Step 5.b.ii: If value is done, return ReturnCompletion(undefined).
      if (result.done) {
        return result
      }
      let mappedValue
      try {
        // Step 5.b.iii: Let mapped be Completion(Call(mapper, undefined, << value, F(counter) >>)).
        mappedValue = mapper(result.value, index)
      } catch (e) {
        // Step 5.b.iv: IfAbruptCloseIterator(mapped, iterated).
        abruptCloseIterator(iterator, e)
      }
      // Step 5.b.vii. Set counter to counter + 1.
      index += 1
      // Step 5.b.v: Let completion be Completion(Yield(mapped)).
      // The `Yield(mapped)` part is simply the return value from the closure.
      return { value: mappedValue, done: false }
    }
  })
  // Step 7: Set result.[[UnderlyingIterator]] to iterated.
  setUnderlyingIterator(wrapper, iterator)
  // Step 8: Return result.
  return wrapper
}
