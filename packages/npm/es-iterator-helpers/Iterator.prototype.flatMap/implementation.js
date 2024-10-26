'use strict'

const {
  ReflectApply,
  TypeErrorCtor,
  abruptCloseIterator,
  createIteratorFromClosure,
  ensureObject,
  getIteratorDirect,
  getIteratorFlattenable,
  getMethod,
  isObjectType,
  setUnderlyingIterator
} = require('../shared')

module.exports = function flatMap(mapper) {
  // ECMAScript Standard Built-in Objects
  // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
  // Built-in function objects that are not identified as constructors do
  // not implement the [[Construct]] internal method unless otherwise
  // specified in the description of a particular function.
  if (new.target) {
    throw new TypeErrorCtor('`flatMap` is not a constructor')
  }
  // Step 2: If O is not an Object, throw TypeError.
  ensureObject(this)
  // Step 3: If IsCallable(mapper) is false, throw TypeError.
  if (typeof mapper !== 'function') {
    throw new TypeErrorCtor('`mapper` must be a function')
  }
  // Step 4: GetIteratorDirect(O).
  const { iterator, next } = getIteratorDirect(this)
  let innerNext = null
  let innerIterator = null
  let innerIteratorReturnCalled = false
  let outerIteratorDone = false
  // Step 5: Create the closure.
  const closure = (function* () {
    let index = 0
    while (true) {
      if (!innerIterator) {
        // Step 5.b.i: Get the next outer value.
        const result = ReflectApply(next, iterator, [])
        if (result.done) {
          // Step 5.b.ii: ReturnCompletion(undefined).
          return
        }
        try {
          // Step 5.b.iii: Call the mapper function.
          const mapped = ReflectApply(mapper, undefined, [result.value, index])
          // Step 5.b.v: GetIteratorFlattenable(mapped).
          ;({ iterator: innerIterator, next: innerNext } =
            getIteratorFlattenable(mapped))
          index += 1
        } catch (e) {
          // Step 5.b.iv: IfAbruptCloseIterator(mapped, iterated).
          abruptCloseIterator(iterator, e)
        }
      }
      // Step 5.b.viii: Inner loop over innerIterator values.
      let innerValue = ReflectApply(innerNext, innerIterator, [])
      while (!innerValue.done) {
        // Step 5.b.viii.4.a: Yield(innerValue).
        yield innerValue.value
        innerValue = innerIterator.next()
      }
      // Reset inner iterator for the next outer value.
      innerIterator = null
    }
  })()
  // Step 5.b.viii.4.b: Handle abrupt completion of yield.
  closure.return = function () {
    if (!outerIteratorDone) {
      outerIteratorDone = true
      let innerReturnResult
      let outerReturnResult
      // Handle the inner iterator return if available.
      if (!innerIteratorReturnCalled && innerIterator) {
        innerIteratorReturnCalled = true
        const innerIteratorReturnMethod = getMethod(innerIterator, 'return')
        if (innerIteratorReturnMethod) {
          innerReturnResult = ReflectApply(
            innerIteratorReturnMethod,
            innerIterator,
            []
          )
          if (!isObjectType(innerReturnResult)) {
            throw new TypeErrorCtor(
              '`Iterator.return` result must be an object'
            )
          }
        }
      }
      // Handle the outer iterator return if available.
      const outerIteratorReturnMethod = getMethod(iterator, 'return')
      if (outerIteratorReturnMethod) {
        outerReturnResult = ReflectApply(
          outerIteratorReturnMethod,
          iterator,
          []
        )
        if (!isObjectType(outerReturnResult)) {
          throw new TypeErrorCtor('`Iterator.return` result must be an object')
        }
      }
      if (innerReturnResult) {
        return innerReturnResult
      }
      if (outerReturnResult) {
        return outerReturnResult
      }
    }
    return { value: undefined, done: true }
  }
  // Step 6: Create the iterator from the closure.
  const wrapper = createIteratorFromClosure(closure)
  // Step 7: Set the [[UnderlyingIterator]] slot.
  setUnderlyingIterator(wrapper, closure)
  // Step 8: Return the result.
  return wrapper
}
