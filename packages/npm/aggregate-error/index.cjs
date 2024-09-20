'use strict'

const Impl = AggregateError

const desc = (value, configurable = true, writable = true) => ({
  __proto__: null,
  configurable,
  value,
  writable
})

const indentString = (string, count = 1) =>
  string.replace(/^(?!\s*$)/gm, ' '.repeat(count))

const AggregateErrorLike = function AggregateError(errors, message) {
  // Behave like the builtin AggregateError when exactly 2 arguments are
  // received or in a known error condition.
  if (arguments.length === 2 || !Array.isArray(errors)) {
    return new Impl(errors, message)
  }
  const { length } = errors
  const errorObjs = new Array(length)
  const stacks = new Array(length)
  for (let i = 0; i < length; i += 1) {
    const value = errors[i]
    let errorObj
    if (value instanceof Error) {
      errorObj = value
    } else {
      // Handle plain objects with message and other properties.
      errorObj =
        value !== null && typeof value === 'object'
          ? Object.assign(new Error(value.message), value)
          : new Error(value)
    }
    errorObjs[i] = errorObj
    // The `stack` property is non-standard but is de facto implemented by all
    // major JavaScript engines. The ECMA262 proposal is currently stage 1:
    // https://github.com/tc39/proposal-error-stacks
    stacks[i] =
      typeof errorObj.stack === 'string' && errorObj.stack.length > 0
        ? errorObj.stack
        : String(errorObj)
  }
  // The function call AggregateError(…) is equivalent to the object creation
  // expression new AggregateError(…) with the same arguments.
  // https://tc39.es/ecma262/#sec-aggregate-error-constructor
  return new Impl(errorObjs, `\n${indentString(stacks.join('\n'), 4)}`)
}

// The %AggregateError.prototype% is a plain object
// https://tc39.es/ecma262/#sec-properties-of-the-aggregate-error-prototype-objects
const AggregateErrorLikeProto = Object.defineProperties(
  {},
  {
    // Copy "message", "name", and any future added prototype properties.
    ...Object.getOwnPropertyDescriptors(Impl.prototype),
    constructor: desc(AggregateErrorLike)
  }
)

// and has a [[Prototype]] internal slot whose value is %Error.prototype%.
Reflect.setPrototypeOf(AggregateErrorLikeProto, Error.prototype)

module.exports = Object.defineProperties(AggregateErrorLike, {
  prototype: desc(AggregateErrorLikeProto, false, false),
  [Symbol.hasInstance]: desc(instance => instance instanceof Impl)
})
