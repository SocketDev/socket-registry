'use strict'

const ErrorCtor = Error
const { iterator: SymbolIterator } = Symbol
const TypeErrorCtor = TypeError

const sentinel = Symbol('sentinel')

const closeIfAbrupt = (iterator, abruptCompletion) => {
  if (iterator && typeof iterator.return === 'function') {
    try {
      // Step 3a.v.3.b: Close iterator on abrupt completion.
      iterator.return()
    } catch {
      // If `return` throws, rethrow the original error.
      throw abruptCompletion
    }
  }
  throw abruptCompletion
}

// Based on the following specification text:
// https://tc39.es/proposal-iterator-sequencing/#sec-iterator.concat
module.exports = function concat(...items) {
  // ECMAScript Standard Built-in Objects
  // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
  // Built-in function objects that are not identified as constructors do
  // not implement the [[Construct]] internal method unless otherwise
  // specified in the description of a particular function.
  if (new.target) {
    throw new TypeError('`Iterator.concat` is not a constructor')
  }
  // Step 1: Initialize empty list for iterables.
  const iterables = []
  // Step 2: Validate each item and add to iterables list.
  for (const item of items) {
    // Step 2a: Ensure each item is an object.
    if (item === null || typeof item !== 'object') {
      throw new TypeErrorCtor(
        '`Iterator.concat` requires all arguments to be objects'
      )
    }
    const method = item[SymbolIterator]
    // Step 2c: Ensure each item is iterable.
    if (typeof method !== 'function') {
      throw new TypeErrorCtor(
        '`Iterator.concat` requires all arguments to be iterable'
      )
    }
    // Step 2d: Add to iterables list.
    iterables.push({ OpenMethod: method, Iterable: item })
  }
  // Step 3: Initialize the inner iterator.
  let innerIterator = sentinel
  // Step 3: Create a closure function to handle iteration.
  let index = 0
  // Step 4: Return the iterator.
  return {
    [SymbolIterator]() {
      return this
    },
    next() {
      // Step 3a: Iterate through each iterable.
      while (index < iterables.length) {
        const { Iterable, OpenMethod } = iterables[index]
        if (innerIterator === sentinel) {
          // Step 3a.i: Call the iterator method.
          innerIterator = OpenMethod.call(Iterable)
          // Step 3a.ii: Ensure iterator is an object.
          if (typeof innerIterator !== 'object' || innerIterator === null) {
            closeIfAbrupt(
              innerIterator,
              new TypeErrorCtor('Iterator result is not an object')
            )
          }
        }
        // Step 3a.v.1: Get the next value.
        const { done, value } = innerIterator.next()
        // Step 3a.v.2: Check if done, move to next iterable if true.
        if (done) {
          innerIterator = sentinel
          index += 1
        } else {
          // Step 3a.v.3.a: Yield the current value.
          return { value, done: false }
        }
      }
      // Step 3b: If all iterables are done, return completed.
      return { value: undefined, done: true }
    },
    return() {
      // Step 3a.v.3.b: Handle abrupt generator close.
      closeIfAbrupt(innerIterator, new ErrorCtor('Generator closed abruptly'))
      return { value: undefined, done: true }
    }
  }
}
