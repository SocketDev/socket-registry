'use strict'

const AggregateErrorCtor = AggregateError
const ArrayCtor = Array
const { isArray: ArrayIsArray } = ArrayCtor
const ErrorCtor = Error
const { assign: ObjectAssign } = Object
const StringCtor = String

const desc = (value, configurable = true, writable = true) => ({
  __proto__: null,
  configurable,
  value,
  writable
})

function indentString(str, count = 1) {
  return str.replace(/^(?!\s*$)/gm, ' '.repeat(count))
}

function AggregateErrorLike(errors, message) {
  // Behave like the builtin AggregateError when exactly 2 arguments are
  // received or in a known error condition.
  if (arguments.length === 2 || !ArrayIsArray(errors)) {
    return new AggregateErrorCtor(errors, message)
  }
  const { length } = errors
  const errorObjs = ArrayCtor(length)
  const stacks = ArrayCtor(length)
  for (let i = 0; i < length; i += 1) {
    const value = errors[i]
    let errorObj
    if (value instanceof ErrorCtor) {
      errorObj = value
    } else {
      // Handle plain objects with message and other properties.
      errorObj =
        value !== null && typeof value === 'object'
          ? ObjectAssign(new ErrorCtor(value.message), value)
          : new ErrorCtor(value)
    }
    errorObjs[i] = errorObj
    // The `stack` property is non-standard but is de facto implemented by all
    // major JavaScript engines. The ECMA262 proposal is currently stage 1:
    // https://github.com/tc39/proposal-error-stacks
    stacks[i] =
      typeof errorObj.stack === 'string' && errorObj.stack.length > 0
        ? errorObj.stack
        : StringCtor(errorObj)
  }
  // The function call AggregateError(…) is equivalent to the object creation
  // expression new AggregateError(…) with the same arguments.
  // https://tc39.es/ecma262/#sec-aggregate-error-constructor
  return new AggregateErrorCtor(
    errorObjs,
    `\n${indentString(stacks.join('\n'), 4)}`
  )
}

// The %AggregateError.prototype% is a plain object
// https://tc39.es/ecma262/#sec-properties-of-the-aggregate-error-prototype-objects
const AggregateErrorLikeProto = Object.defineProperties(
  {},
  {
    // Copy "message", "name", and any future added prototype properties.
    ...Object.getOwnPropertyDescriptors(AggregateErrorCtor.prototype),
    constructor: desc(AggregateErrorLike)
  }
)
// and has a [[Prototype]] internal slot whose value is %Error.prototype%.
Reflect.setPrototypeOf(AggregateErrorLikeProto, ErrorCtor.prototype)

Object.defineProperties(AggregateErrorLike, {
  prototype: desc(AggregateErrorLikeProto, false, false),
  [Symbol.hasInstance]: desc(instance => instance instanceof AggregateErrorCtor)
})

module.exports = AggregateErrorLike
