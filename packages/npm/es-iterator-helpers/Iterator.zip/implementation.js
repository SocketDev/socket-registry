'use strict'

const {
  TypeErrorCtor,
  ensureObject,
  getIterator,
  getIteratorFlattenable,
  getOptionsObject,
  iteratorZip,
} = require('../shared')

// Based on https://tc39.es/proposal-joint-iteration/#sec-iterator.zip.
module.exports = function zip(iterables, options) {
  // Built-in functions that are not identified as constructors do
  // not implement [[Construct]] unless otherwise specified.
  // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
  if (new.target) {
    throw new TypeErrorCtor('`Iterator.zip` is not a constructor')
  }
  // Step 1: If iterables is not an Object, throw a TypeError exception.
  ensureObject(iterables, 'iterables')

  // Step 2: Set options to ? GetOptionsObject(options).
  // Step 3: Let mode be ? Get(options, "mode").
  // Step 4: If mode is undefined, set mode to "shortest".
  const { mode = 'shortest' } = getOptionsObject(options)
  // Step 5: If mode is not one of "shortest", "longest", or "strict", throw a TypeError exception.
  if (mode !== 'longest' && mode !== 'shortest' && mode !== 'strict') {
    throw new TypeErrorCtor('Invalid mode for Iterator.zip')
  }

  // Step 6: Let paddingOption be undefined.
  let paddingOption
  // Step 7: If mode is "longest", then
  if (mode === 'longest') {
    // Step 7.a: Set paddingOption to ? Get(options, "padding").
    paddingOption = options?.padding
    // Step 7.b: If paddingOption is not undefined and paddingOption is not an Object, throw a TypeError exception.
    if (paddingOption !== undefined) {
      ensureObject(paddingOption, 'padding')
    }
  }

  // Step 8: Let iters be a new empty List.
  const iters = []
  // Step 9: Let padding be a new empty List.
  const padding = []
  // Step 10: Let inputIter be ? GetIterator(iterables, sync).
  const inputIter = getIterator(iterables)
  // Step 11: Let next be not-started.
  let next = { done: false }
  // Step 12: Repeat, while next is not done,
  while (!next.done) {
    // Step 12.a: Set next to Completion(IteratorStepValue(inputIter)).
    next = inputIter.next()
    // Step 12.b: IfAbruptCloseIterators(next, iters).
    // (This is managed implicitly by JavaScript exception handling.)
    // Step 12.c: If next is not done, then
    if (!next.done) {
      // Step 12.c.i: Let iter be Completion(GetIteratorFlattenable(next, reject-strings)).
      // Step 12.c.ii: IfAbruptCloseIterators(iter, the list-concatenation of « inputIter » and iters).
      // Step 12.c.iii: Append iter to iters.
      iters.push(getIteratorFlattenable(next.value))
    }
  }

  // Step 13: Let iterCount be the number of elements in iters.
  const { length: iterCount } = iters

  // Step 14: If mode is "longest", then
  if (mode === 'longest') {
    // Step 14.a: If paddingOption is undefined, then
    if (paddingOption === undefined) {
      // Step 14.a.i: Perform the following steps iterCount times:
      for (let i = 0; i < iterCount; i += 1) {
        // Step 14.a.i.1: Append undefined to padding.
        padding.push(undefined)
      }
    } else {
      // Step 14.b: Else,
      // Step 14.b.i: Let paddingIter be Completion(GetIterator(paddingOption, sync)).
      const paddingIter = getIterator(paddingOption)
      let usingIterator = true
      // Step 14.b.iv: Perform the following steps iterCount times:
      for (let i = 0; i < iterCount; i += 1) {
        if (usingIterator) {
          const nextPadding = paddingIter.next()
          if (nextPadding.done) {
            usingIterator = false
          } else {
            padding.push(nextPadding.value)
            continue
          }
        }
        padding.push(undefined)
      }
    }
  }

  // Step 16: Return IteratorZip(iters, mode, padding, finishResults).
  return iteratorZip(
    iters,
    mode,
    padding,
    // Step 15: Let finishResults be a new Abstract Closure with parameters (results) that captures nothing and performs the following steps when called:
    function finishResults(results) {
      // Step 15.a: Return CreateArrayFromList(results).
      return results
    },
  )
}
