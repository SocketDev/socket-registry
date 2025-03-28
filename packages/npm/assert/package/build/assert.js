// Currently in sync with Node.js lib/assert.js
// https://github.com/nodejs/node/commit/2a51ae424a513ec9a6aa3466baa0cc1d55dd4f3b

// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict'

function _typeof(o) {
  '@babel/helpers - typeof'
  return (
    (_typeof =
      'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
        ? function (o) {
            return typeof o
          }
        : function (o) {
            return o &&
              'function' == typeof Symbol &&
              o.constructor === Symbol &&
              o !== Symbol.prototype
              ? 'symbol'
              : typeof o
          }),
    _typeof(o)
  )
}
function _defineProperties(target, props) {
  for (let i = 0; i < props.length; i++) {
    const descriptor = props[i]
    descriptor.enumerable = descriptor.enumerable || false
    descriptor.configurable = true
    if ('value' in descriptor) {
      descriptor.writable = true
    }
    Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor)
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) {
    _defineProperties(Constructor.prototype, protoProps)
  }
  if (staticProps) {
    _defineProperties(Constructor, staticProps)
  }
  Object.defineProperty(Constructor, 'prototype', { writable: false })
  return Constructor
}
function _toPropertyKey(arg) {
  const key = _toPrimitive(arg, 'string')
  return _typeof(key) === 'symbol' ? key : String(key)
}
function _toPrimitive(input, hint) {
  if (_typeof(input) !== 'object' || input === null) {
    return input
  }
  const prim = input[Symbol.toPrimitive]
  if (prim !== undefined) {
    const res = prim.call(input, hint || 'default')
    if (_typeof(res) !== 'object') {
      return res
    }
    throw new TypeError('@@toPrimitive must return a primitive value.')
  }
  return (hint === 'string' ? String : Number)(input)
}
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function')
  }
}
const RegExpPrototypeTest =
  require('@socketoverride/assert__call-bind/callBound')(
    'RegExp.prototype.test'
  )
const objectIs = require('object-is/polyfill')()
const objectAssign = require('object.assign/polyfill')()
const _require$types = require('util/').types,
  isPromise = _require$types.isPromise,
  isRegExp = _require$types.isRegExp

const _require = require('./internal/errors'),
  _require$codes = _require.codes,
  ERR_AMBIGUOUS_ARGUMENT = _require$codes.ERR_AMBIGUOUS_ARGUMENT,
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_INVALID_ARG_VALUE = _require$codes.ERR_INVALID_ARG_VALUE,
  ERR_INVALID_RETURN_VALUE = _require$codes.ERR_INVALID_RETURN_VALUE,
  ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS
const AssertionError = require('./internal/assert/assertion_error')

const _require2 = require('util/'),
  inspect = _require2.inspect
let isDeepEqual
let isDeepStrictEqual
function lazyLoadComparison() {
  const comparison = require('./internal/util/comparisons')
  isDeepEqual = comparison.isDeepEqual
  isDeepStrictEqual = comparison.isDeepStrictEqual
}

const meta = [
  '\\u0000',
  '\\u0001',
  '\\u0002',
  '\\u0003',
  '\\u0004',
  '\\u0005',
  '\\u0006',
  '\\u0007',
  '\\b',
  '',
  '',
  '\\u000b',
  '\\f',
  '',
  '\\u000e',
  '\\u000f',
  '\\u0010',
  '\\u0011',
  '\\u0012',
  '\\u0013',
  '\\u0014',
  '\\u0015',
  '\\u0016',
  '\\u0017',
  '\\u0018',
  '\\u0019',
  '\\u001a',
  '\\u001b',
  '\\u001c',
  '\\u001d',
  '\\u001e',
  '\\u001f'
]
let warned = false

// The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

const assert = (module.exports = ok)
const NO_EXCEPTION_SENTINEL = {}

// All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided. All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function innerFail(obj) {
  if (obj.message instanceof Error) {
    throw obj.message
  }
  throw new AssertionError(obj)
}
function fail(actual, expected, message, operator, stackStartFn) {
  const argsLen = arguments.length
  let internalMessage
  if (argsLen === 0) {
    internalMessage = 'Failed'
  } else if (argsLen === 1) {
    message = actual
    actual = undefined
  } else {
    if (warned === false) {
      warned = true
      const warn = process.emitWarning
        ? process.emitWarning
        : console.warn.bind(console)
      warn(
        'assert.fail() with more than one argument is deprecated. ' +
          'Please use assert.strictEqual() instead or only pass a message.',
        'DeprecationWarning',
        'DEP0094'
      )
    }
    if (argsLen === 2) {
      operator = '!='
    }
  }
  if (message instanceof Error) {
    throw message
  }
  const errArgs = {
    actual: actual,
    expected: expected,
    operator: operator === undefined ? 'fail' : operator,
    stackStartFn: stackStartFn || fail
  }
  if (message !== undefined) {
    errArgs.message = message
  }
  const err = new AssertionError(errArgs)
  if (internalMessage) {
    err.message = internalMessage
    err.generatedMessage = true
  }
  throw err
}
assert.fail = fail

// The AssertionError is defined in internal/error.
assert.AssertionError = AssertionError
function innerOk(fn, argLen, value, message) {
  if (!value) {
    let generatedMessage = false
    if (argLen === 0) {
      generatedMessage = true
      message = 'No value argument passed to `assert.ok()`'
    } else if (message instanceof Error) {
      throw message
    }
    const err = new AssertionError({
      actual: value,
      expected: true,
      message: message,
      operator: '==',
      stackStartFn: fn
    })
    err.generatedMessage = generatedMessage
    throw err
  }
}

// Pure assertion tests whether a value is truthy, as determined
// by !!value.
function ok() {
  for (
    let _len = arguments.length, args = new Array(_len), _key = 0;
    _key < _len;
    _key++
  ) {
    args[_key] = arguments[_key]
  }
  innerOk.apply(void 0, [ok, args.length].concat(args))
}
assert.ok = ok

// The equality assertion tests shallow, coercive equality with ==.

assert.equal = function equal(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected')
  }

  if (actual != expected) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: '==',
      stackStartFn: equal
    })
  }
}

// The non-equality assertion tests for whether two objects are not
// equal with !=.
assert.notEqual = function notEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected')
  }

  if (actual == expected) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: '!=',
      stackStartFn: notEqual
    })
  }
}

// The equivalence assertion tests a deep equality relation.
assert.deepEqual = function deepEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected')
  }
  if (isDeepEqual === undefined) {
    lazyLoadComparison()
  }
  if (!isDeepEqual(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'deepEqual',
      stackStartFn: deepEqual
    })
  }
}

// The non-equivalence assertion tests for any deep inequality.
assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected')
  }
  if (isDeepEqual === undefined) {
    lazyLoadComparison()
  }
  if (isDeepEqual(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'notDeepEqual',
      stackStartFn: notDeepEqual
    })
  }
}

assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected')
  }
  if (isDeepEqual === undefined) {
    lazyLoadComparison()
  }
  if (!isDeepStrictEqual(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'deepStrictEqual',
      stackStartFn: deepStrictEqual
    })
  }
}
assert.notDeepStrictEqual = notDeepStrictEqual
function notDeepStrictEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected')
  }
  if (isDeepEqual === undefined) {
    lazyLoadComparison()
  }
  if (isDeepStrictEqual(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'notDeepStrictEqual',
      stackStartFn: notDeepStrictEqual
    })
  }
}
assert.strictEqual = function strictEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected')
  }
  if (!objectIs(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'strictEqual',
      stackStartFn: strictEqual
    })
  }
}
assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected')
  }
  if (objectIs(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'notStrictEqual',
      stackStartFn: notStrictEqual
    })
  }
}
const Comparison = /*@__PURE__*/ _createClass(
  function Comparison(obj, keys, actual) {
    const _this = this
    _classCallCheck(this, Comparison)
    keys.forEach(function (key) {
      if (key in obj) {
        if (
          actual !== undefined &&
          typeof actual[key] === 'string' &&
          isRegExp(obj[key]) &&
          RegExpPrototypeTest(obj[key], actual[key])
        ) {
          _this[key] = actual[key]
        } else {
          _this[key] = obj[key]
        }
      }
    })
  }
)
function compareExceptionKey(actual, expected, key, message, keys, fn) {
  if (!(key in actual) || !isDeepStrictEqual(actual[key], expected[key])) {
    if (!message) {
      // Create placeholder objects to create a nice output.
      const a = new Comparison(actual, keys)
      const b = new Comparison(expected, keys, actual)
      const err = new AssertionError({
        actual: a,
        expected: b,
        operator: 'deepStrictEqual',
        stackStartFn: fn
      })
      err.actual = actual
      err.expected = expected
      err.operator = fn.name
      throw err
    }
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: fn.name,
      stackStartFn: fn
    })
  }
}
function expectedException(actual, expected, msg, fn) {
  if (typeof expected !== 'function') {
    if (isRegExp(expected)) {
      return RegExpPrototypeTest(expected, actual)
    }
    // assert.doesNotThrow does not accept objects.
    if (arguments.length === 2) {
      throw new ERR_INVALID_ARG_TYPE(
        'expected',
        ['Function', 'RegExp'],
        expected
      )
    }

    // Handle primitives properly.
    if (_typeof(actual) !== 'object' || actual === null) {
      const err = new AssertionError({
        actual: actual,
        expected: expected,
        message: msg,
        operator: 'deepStrictEqual',
        stackStartFn: fn
      })
      err.operator = fn.name
      throw err
    }
    const keys = Object.keys(expected)
    // Special handle errors to make sure the name and the message are compared
    // as well.
    if (expected instanceof Error) {
      keys.push('name', 'message')
    } else if (keys.length === 0) {
      throw new ERR_INVALID_ARG_VALUE(
        'error',
        expected,
        'may not be an empty object'
      )
    }
    if (isDeepEqual === undefined) {
      lazyLoadComparison()
    }
    keys.forEach(function (key) {
      if (
        typeof actual[key] === 'string' &&
        isRegExp(expected[key]) &&
        RegExpPrototypeTest(expected[key], actual[key])
      ) {
        return
      }
      compareExceptionKey(actual, expected, key, msg, keys, fn)
    })
    return true
  }
  // Guard instanceof against arrow functions as they don't have a prototype.
  if (expected.prototype !== undefined && actual instanceof expected) {
    return true
  }
  if (Error.isPrototypeOf(expected)) {
    return false
  }
  return expected.call({}, actual) === true
}
function getActual(fn) {
  if (typeof fn !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('fn', 'Function', fn)
  }
  try {
    fn()
  } catch (e) {
    return e
  }
  return NO_EXCEPTION_SENTINEL
}
function checkIsPromise(obj) {
  // Accept native ES6 promises and promises that are implemented in a similar
  // way. Do not accept thenables that use a function as `obj` and that have no
  // `catch` handler.

  // TODO: thenables are checked up until they have the correct methods,
  // but according to documentation, the `then` method should receive
  // the `fulfill` and `reject` arguments as well or it may be never resolved.

  return (
    isPromise(obj) ||
    (obj !== null &&
      _typeof(obj) === 'object' &&
      typeof obj.then === 'function' &&
      typeof obj.catch === 'function')
  )
}
function waitForActual(promiseFn) {
  return Promise.resolve().then(function () {
    let resultPromise
    if (typeof promiseFn === 'function') {
      // Return a rejected promise if `promiseFn` throws synchronously.
      resultPromise = promiseFn()
      // Fail in case no promise is returned.
      if (!checkIsPromise(resultPromise)) {
        throw new ERR_INVALID_RETURN_VALUE(
          'instance of Promise',
          'promiseFn',
          resultPromise
        )
      }
    } else if (checkIsPromise(promiseFn)) {
      resultPromise = promiseFn
    } else {
      throw new ERR_INVALID_ARG_TYPE(
        'promiseFn',
        ['Function', 'Promise'],
        promiseFn
      )
    }
    return Promise.resolve()
      .then(function () {
        return resultPromise
      })
      .then(function () {
        return NO_EXCEPTION_SENTINEL
      })
      .catch(function (e) {
        return e
      })
  })
}
function expectsError(stackStartFn, actual, error, message) {
  if (typeof error === 'string') {
    if (arguments.length === 4) {
      throw new ERR_INVALID_ARG_TYPE(
        'error',
        ['Object', 'Error', 'Function', 'RegExp'],
        error
      )
    }
    if (_typeof(actual) === 'object' && actual !== null) {
      if (actual.message === error) {
        throw new ERR_AMBIGUOUS_ARGUMENT(
          'error/message',
          'The error message "'.concat(
            actual.message,
            '" is identical to the message.'
          )
        )
      }
    } else if (actual === error) {
      throw new ERR_AMBIGUOUS_ARGUMENT(
        'error/message',
        'The error "'.concat(actual, '" is identical to the message.')
      )
    }
    message = error
    error = undefined
  } else if (
    error != null &&
    _typeof(error) !== 'object' &&
    typeof error !== 'function'
  ) {
    throw new ERR_INVALID_ARG_TYPE(
      'error',
      ['Object', 'Error', 'Function', 'RegExp'],
      error
    )
  }
  if (actual === NO_EXCEPTION_SENTINEL) {
    let details = ''
    if (error && error.name) {
      details += ' ('.concat(error.name, ')')
    }
    details += message ? ': '.concat(message) : '.'
    const fnType = stackStartFn.name === 'rejects' ? 'rejection' : 'exception'
    innerFail({
      actual: undefined,
      expected: error,
      operator: stackStartFn.name,
      message: 'Missing expected '.concat(fnType).concat(details),
      stackStartFn: stackStartFn
    })
  }
  if (error && !expectedException(actual, error, message, stackStartFn)) {
    throw actual
  }
}
function expectsNoError(stackStartFn, actual, error, message) {
  if (actual === NO_EXCEPTION_SENTINEL) {
    return
  }
  if (typeof error === 'string') {
    message = error
    error = undefined
  }
  if (!error || expectedException(actual, error)) {
    const details = message ? ': '.concat(message) : '.'
    const fnType =
      stackStartFn.name === 'doesNotReject' ? 'rejection' : 'exception'
    innerFail({
      actual: actual,
      expected: error,
      operator: stackStartFn.name,
      message:
        'Got unwanted '.concat(fnType).concat(details, '\n') +
        'Actual message: "'.concat(actual && actual.message, '"'),
      stackStartFn: stackStartFn
    })
  }
  throw actual
}
assert.throws = function throws(promiseFn) {
  for (
    let _len2 = arguments.length,
      args = new Array(_len2 > 1 ? _len2 - 1 : 0),
      _key2 = 1;
    _key2 < _len2;
    _key2++
  ) {
    args[_key2 - 1] = arguments[_key2]
  }
  expectsError.apply(void 0, [throws, getActual(promiseFn)].concat(args))
}
assert.rejects = function rejects(promiseFn) {
  for (
    let _len3 = arguments.length,
      args = new Array(_len3 > 1 ? _len3 - 1 : 0),
      _key3 = 1;
    _key3 < _len3;
    _key3++
  ) {
    args[_key3 - 1] = arguments[_key3]
  }
  return waitForActual(promiseFn).then(function (result) {
    return expectsError.apply(void 0, [rejects, result].concat(args))
  })
}
assert.doesNotThrow = function doesNotThrow(fn) {
  for (
    let _len4 = arguments.length,
      args = new Array(_len4 > 1 ? _len4 - 1 : 0),
      _key4 = 1;
    _key4 < _len4;
    _key4++
  ) {
    args[_key4 - 1] = arguments[_key4]
  }
  expectsNoError.apply(void 0, [doesNotThrow, getActual(fn)].concat(args))
}
assert.doesNotReject = function doesNotReject(fn) {
  for (
    let _len5 = arguments.length,
      args = new Array(_len5 > 1 ? _len5 - 1 : 0),
      _key5 = 1;
    _key5 < _len5;
    _key5++
  ) {
    args[_key5 - 1] = arguments[_key5]
  }
  return waitForActual(fn).then(function (result) {
    return expectsNoError.apply(void 0, [doesNotReject, result].concat(args))
  })
}
assert.ifError = function ifError(err) {
  if (err !== null && err !== undefined) {
    let message = 'ifError got unwanted exception: '
    if (_typeof(err) === 'object' && typeof err.message === 'string') {
      if (err.message.length === 0 && err.constructor) {
        message += err.constructor.name
      } else {
        message += err.message
      }
    } else {
      message += inspect(err)
    }
    const newErr = new AssertionError({
      actual: err,
      expected: null,
      operator: 'ifError',
      message: message,
      stackStartFn: ifError
    })

    // Make sure we actually have a stack trace!
    const origStack = err.stack
    if (typeof origStack === 'string') {
      // This will remove any duplicated frames from the error frames taken
      // from within `ifError` and add the original error frames to the newly
      // created ones.
      const tmp2 = origStack.split('\n')
      tmp2.shift()
      // Filter all frames existing in err.stack.
      let tmp1 = newErr.stack.split('\n')
      for (let i = 0; i < tmp2.length; i++) {
        // Find the first occurrence of the frame.
        const pos = tmp1.indexOf(tmp2[i])
        if (pos !== -1) {
          // Only keep new frames.
          tmp1 = tmp1.slice(0, pos)
          break
        }
      }
      newErr.stack = ''.concat(tmp1.join('\n'), '\n').concat(tmp2.join('\n'))
    }
    throw newErr
  }
}

// Currently in sync with Node.js lib/assert.js
// https://github.com/nodejs/node/commit/2a871df3dfb8ea663ef5e1f8f62701ec51384ecb
function internalMatch(string, regexp, message, fn, fnName) {
  if (!isRegExp(regexp)) {
    throw new ERR_INVALID_ARG_TYPE('regexp', 'RegExp', regexp)
  }
  const match = fnName === 'match'
  if (
    typeof string !== 'string' ||
    RegExpPrototypeTest(regexp, string) !== match
  ) {
    if (message instanceof Error) {
      throw message
    }
    const generatedMessage = !message

    // 'The input was expected to not match the regular expression ' +
    message =
      message ||
      (typeof string !== 'string'
        ? 'The "string" argument must be of type string. Received type ' +
          ''.concat(_typeof(string), ' (').concat(inspect(string), ')')
        : (match
            ? 'The input did not match the regular expression '
            : 'The input was expected to not match the regular expression ') +
          ''
            .concat(inspect(regexp), '. Input:\n\n')
            .concat(inspect(string), '\n'))
    const err = new AssertionError({
      actual: string,
      expected: regexp,
      message: message,
      operator: fnName,
      stackStartFn: fn
    })
    err.generatedMessage = generatedMessage
    throw err
  }
}
assert.match = function match(string, regexp, message) {
  internalMatch(string, regexp, message, match, 'match')
}
assert.doesNotMatch = function doesNotMatch(string, regexp, message) {
  internalMatch(string, regexp, message, doesNotMatch, 'doesNotMatch')
}

// Expose a strict only variant of assert
function strict() {
  for (
    let _len6 = arguments.length, args = new Array(_len6), _key6 = 0;
    _key6 < _len6;
    _key6++
  ) {
    args[_key6] = arguments[_key6]
  }
  innerOk.apply(void 0, [strict, args.length].concat(args))
}
assert.strict = objectAssign(strict, assert, {
  equal: assert.strictEqual,
  deepEqual: assert.deepStrictEqual,
  notEqual: assert.notStrictEqual,
  notDeepEqual: assert.notDeepStrictEqual
})
assert.strict.strict = assert.strict
