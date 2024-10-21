'use strict'

const ArrayCtor = Array
const { toReversed: ArrayProtoToReversed } = ArrayCtor.prototype
const ObjectCtor = Object

module.exports =
  typeof ArrayProtoToReversed === 'function'
    ? ArrayProtoToReversed
    : // Based on the following specification text:
      // https://tc39.es/ecma262/#sec-array.prototype.toreversed
      function toReversed() {
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeError('`toReversed` is not a constructor')
        }
        // Step 1: Let O be ToObject(this value).
        const O = ObjectCtor(this)
        // Step 2: Let len be LengthOfArrayLike(O).
        const len = O.length >>> 0
        // Step 3: Let A be ArrayCreate(len).
        const A = new ArrayCtor(len)
        // Step 4: Let k be 0.
        let k = 0
        // Step 5: Repeat, while k < len,
        while (k < len) {
          // Step 5a: Let from be ToString(F(len - k - 1)).
          // Step 5b: Let Pk be ToString(F(k)).
          // Step 5c: Let fromValue be Get(O, from).
          // Step 5d: Perform CreateDataPropertyOrThrow(A, Pk, fromValue).
          A[k] = O[len - k - 1]
          // Step 5e: Set k to k + 1.
          k += 1
        }
        // Step 6: Return A.
        return A
      }
