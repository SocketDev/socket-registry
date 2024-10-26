'use strict'

const ArrayCtor = Array
const { toReversed: ArrayProtoToReversed } = ArrayCtor.prototype

module.exports =
  typeof ArrayProtoToReversed === 'function'
    ? ArrayProtoToReversed
    : (() => {
        const { trunc: MathTrunc } = Math
        const NumberCtor = Number
        const { MAX_SAFE_INTEGER, isNaN: NumberIsNaN } = NumberCtor
        const ObjectCtor = Object
        const TypeErrorCtor = TypeError

        // Based specification text:
        // https://tc39.es/ecma262/#sec-array.prototype.toreversed
        return function toReversed() {
          // ECMAScript Standard Built-in Objects
          // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
          // Built-in function objects that are not identified as constructors do
          // not implement the [[Construct]] internal method unless otherwise
          // specified in the description of a particular function.
          if (new.target) {
            throw new TypeErrorCtor('`toReversed` is not a constructor')
          }
          // Step 1: Let O be ToObject(this value).
          if (this === null || this === undefined) {
            throw new TypeErrorCtor(`Cannot call method on ${this}`)
          }
          const O = ObjectCtor(this)
          // Step 2: Let len be LengthOfArrayLike(O).
          let numLen = NumberCtor(O.length)
          if (numLen === 0 || NumberIsNaN(numLen)) {
            numLen = 0
          }
          const integerNum =
            numLen === Infinity || numLen === -Infinity
              ? numLen
              : MathTrunc(numLen)
          const len =
            integerNum <= 0
              ? 0
              : integerNum > MAX_SAFE_INTEGER
                ? MAX_SAFE_INTEGER
                : integerNum
          // Step 3: Let A be ArrayCreate(len).
          const A = ArrayCtor(len)
          // Step 4: Let k be 0.
          let k = 0
          // Step 5: Repeat, while k < len,
          while (k < len) {
            // Step 5.a: Let from be ToString(F(len - k - 1)).
            // Step 5.b: Let Pk be ToString(F(k)).
            // Step 5.c: Let fromValue be Get(O, from).
            // Step 5.d: Perform CreateDataPropertyOrThrow(A, Pk, fromValue).
            A[k] = O[len - k - 1]
            // Step 5.e: Set k to k + 1.
            k += 1
          }
          // Step 6: Return A.
          return A
        }
      })()
