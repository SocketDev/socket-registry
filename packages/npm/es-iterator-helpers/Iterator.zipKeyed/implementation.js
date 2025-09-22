'use strict'

const {
  ObjectGetOwnPropertyDescriptor,
  ReflectOwnKeys,
  TypeErrorCtor,
  ensureObject,
  getIteratorFlattenable,
  getOptionsObject,
  ifAbruptCloseIterator,
  iteratorZip,
} = require('../shared')

// Based on https://tc39.es/proposal-joint-iteration/#sec-iterator.zipkeyed.
module.exports = function zipKeyed(iterables, options) {
  // Built-in functions that are not identified as constructors do
  // not implement [[Construct]] unless otherwise specified.
  // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
  if (new.target) {
    throw new TypeErrorCtor('`Iterator.zipKeyed` is not a constructor')
  }
  // Step 1: If iterables is not an Object, throw a TypeError exception.
  ensureObject(iterables, 'iterables')

  // Step 2: Set options to ? GetOptionsObject(options).
  // Step 3: Let mode be ? Get(options, "mode").
  // Step 4: If mode is undefined, set mode to "shortest".
  const { mode = 'shortest' } = getOptionsObject(options)
  // Step 5: If mode is not one of "shortest", "longest", or "strict", throw a TypeError exception.
  if (mode !== 'longest' && mode !== 'shortest' && mode !== 'strict') {
    throw new TypeErrorCtor('Invalid mode for Iterator.zipKeyed')
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
  // Step 10: Let allKeys be ? iterables.[[OwnPropertyKeys]]().
  const allKeys = ReflectOwnKeys(iterables)
  // Step 11: Let keys be a new empty List.
  const keys = []
  // Step 12: For each element key of allKeys, do
  for (const key of allKeys) {
    // Step 12.a: Let desc be Completion(iterables.[[GetOwnProperty]](key)).
    const desc = ObjectGetOwnPropertyDescriptor(iterables, key)
    // Step 12.b: IfAbruptCloseIterators(desc, iters).
    // (Managed implicitly by exception handling.)
    // Step 12.c: If desc is not undefined and desc.[[Enumerable]] is true, then
    if (desc?.enumerable) {
      // Step 12.c.i: Let value be undefined.
      let value
      // Step 12.c.ii: If IsDataDescriptor(desc) is true, then
      if ('value' in desc) {
        // Step 12.c.ii.1: Set value to desc.[[Value]].
        value = desc.value
      } else if (desc.get) {
        // Step 12.c.iii.1: Assert: IsAccessorDescriptor(desc) is true.
        // Step 12.c.iii.2: Let getter be desc.[[Get]].
        // Step 12.c.iii.3: If getter is not undefined, then
        // Step 12.c.iii.3.a: Let getterResult be Completion(Call(getter, iterables)).
        // Step 12.c.iii.3.b: IfAbruptCloseIterators(getterResult, iters).
        // Step 12.c.iii.3.c: Set value to getterResult.
        value = desc.get.call(iterables)
      }

      // Step 12.c.iv: If value is not undefined, then
      if (value !== undefined) {
        // Step 12.c.iv.1: Append key to keys.
        keys[keys.length] = key
        // Step 12.c.iv.2: Let iter be Completion(GetIteratorFlattenable(value, reject-strings)).
        let iter
        try {
          iter = getIteratorFlattenable(value)
        } catch (e) {
          // Step 12.c.iv.3: IfAbruptCloseIterators(iter, iters).
          ifAbruptCloseIterator(iters, e)
        }
        // Step 12.c.iv.4: Append iter to iters.
        iters[iters.length] = iter
      }
    }
  }

  // Step 13: Let iterCount be the number of elements in iters.
  const { length: iterCount } = iters

  // Step 14: If mode is "longest", then
  if (mode === 'longest') {
    // Step 14.a: If paddingOption is undefined, then
    if (paddingOption === undefined) {
      // Step 14.a.i: Perform the following steps iterCount times:
      // Step 14.a.i.1: Append undefined to padding.
      for (let i = 0; i < iterCount; i += 1) {
        padding.push(undefined)
      }
    } else {
      // Step 14.b: For each element key of keys, do
      for (const key of keys) {
        // Step 14.b.i: Let value be Completion(Get(paddingOption, key)).
        // Step 14.b.ii: IfAbruptCloseIterators(value, iters).
        // Step 14.b.iii: Append value to padding.
        padding.push(paddingOption[key])
      }
    }
  }

  // Step 16: Return IteratorZip(iters, mode, padding, finishResults).
  return iteratorZip(
    iters,
    mode,
    padding,
    // Step 15: Let finishResults be a new Abstract Closure with parameters (results).
    function finishResults(results) {
      // Step 15.a: Let obj be OrdinaryObjectCreate(null).
      const obj = Object.create(null)
      // Step 15.b: For each integer i such that 0 ≤ i < iterCount, in ascending order, do
      for (let i = 0; i < iterCount; i += 1) {
        // Step 15.b.i: Perform ! CreateDataPropertyOrThrow(obj, keys[i], results[i]).
        obj[keys[i]] = results[i]
      }
      // Step 15.c: Return obj.
      return obj
    },
  )
}
