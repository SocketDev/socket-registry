'use strict'

const ArrayCtor = Array
const { prototype: ArrayProto } = ArrayCtor
const { toSorted: ArrayProtoToSorted } = ArrayProto

module.exports =
  typeof ArrayProtoToSorted === 'function'
    ? ArrayProtoToSorted
    : (() => {
        const { sort: ArrayProtoSort } = ArrayProto
        const { trunc: MathTrunc } = Math
        const NumberCtor = Number
        const { MAX_SAFE_INTEGER, isNaN: NumberIsNaN } = NumberCtor
        const ObjectCtor = Object
        const { apply: ReflectApply } = Reflect
        const TypeErrorCtor = TypeError

        // Based specification text:
        // https://tc39.es/ecma262/#sec-array.prototype.tosorted
        return function toSorted(comparator) {
          // ECMAScript Standard Built-in Objects
          // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
          // Built-in function objects that are not identified as constructors do
          // not implement the [[Construct]] internal method unless otherwise
          // specified in the description of a particular function.
          if (new.target) {
            throw new TypeErrorCtor('`toSorted` is not a constructor')
          }
          // Step 1: If comparator is not `undefined` and IsCallable(comparator)
          // is `false`, throw a TypeError exception.
          if (comparator !== undefined && typeof comparator !== 'function') {
            throw new TypeErrorCtor(
              'Comparator must be a function or undefined'
            )
          }
          // Step 2: Let O be ToObject(this value).
          if (this === null || this === undefined) {
            throw new TypeErrorCtor(`Cannot call method on ${this}`)
          }
          const O = ObjectCtor(this)
          // Step 3: Let len be LengthOfArrayLike(O).
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
          // Step 4: Let A be ArrayCreate(len).
          const A = ArrayCtor(len)
          for (let i = 0; i < len; i += 1) {
            A[i] = O[i]
          }
          // Step 5: Let SortCompare be a new Abstract Closure with parameters (x, y)
          // that captures comparator and performs the following steps when called.
          // Step 6: Let sortedList be SortIndexedProperties(O, len, SortCompare, read-through-holes).
          // Step 7: Let j be 0.
          // Step 8: Repeat, while j < len
          // Step 8.a: Perform CreateDataPropertyOrThrow(A, ToString(j), sortedList[j]).
          // Step 8.b: Set j to j + 1.
          // Step 9: Return A.
          return ReflectApply(ArrayProtoSort, A, [comparator])
        }
      })()
