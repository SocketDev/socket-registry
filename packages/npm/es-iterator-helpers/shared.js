'use strict'

const { toString: fnToStr } = Function.prototype

const classRegExp = /^\s*class\b/

function createBoundIteratorMethod(iterator, key) {
  // This access of the iterator method is observable.
  const { [key]: unbound } = iterator
  if (isCallable(unbound)) {
    return {
      // Using a computed property will give the anonymous method the name of
      // the computed property.
      [key]: function (...args) {
        return Reflect.apply(unbound, iterator, [args])
      }
    }[key]
  }
  if (key === 'return') {
    return unbound
  }
  const msg = `${unbound === null ? 'object null' : typeof unbound} is not a function`
  return {
    [key]: function () {
      throw new TypeError(msg)
    }
  }[key]
}

function fixIterator(iterator) {
  if (!isObjectType(iterator)) {
    return iterator
  }
  // Don't access the iterator methods ahead of time so that the access is
  // not observable.
  let boundNext
  let boundReturn
  return {
    get next() {
      if (boundNext === undefined) {
        boundNext = createBoundIteratorMethod(iterator, 'next')
      }
      return boundNext
    },
    get return() {
      if (boundReturn === undefined) {
        boundReturn = createBoundIteratorMethod(iterator, 'return')
      }
      return boundReturn
    }
  }
}

function isEs6Class(value) {
  try {
    return classRegExp.test(fnToStr.call(value))
  } catch {}
  return false
}

function isCallable(value) {
  return typeof value === 'function' && !isEs6Class(value)
}

function isObjectType(value) {
  return (
    typeof value === 'function' || (value !== null && typeof value === 'object')
  )
}

const isIteratorNextCheckBuggy = (IteratorPrototype, methodName, ...args) => {
  const builtinMethod = IteratorPrototype?.[methodName]
  if (typeof builtinMethod === 'function') {
    // Step 7 of https://tc39.es/proposal-iterator-helpers/#sec-iteratorprototype.drop
    // calls https://tc39.es/proposal-iterator-helpers/#sec-getiteratordirect
    // which makes an Iterator Record with [[NextMethod]] set to null. When the
    // resulting iterator is iterated, it will call https://tc39.es/ecma262/#sec-iteratorstep,
    // which calls https://tc39.es/ecma262/#sec-iteratornext and attempts to Call
    // a null. Which must throw.
    // https://issues.chromium.org/issues/336839115
    try {
      builtinMethod.call({ next: null }, ...args).next()
      return true
    } catch {}
  }
  return false
}

module.exports = {
  fixIterator,
  isIteratorNextCheckBuggy
}
