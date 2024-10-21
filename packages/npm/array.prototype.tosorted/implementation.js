'use strict'

const {
  slice: ArrayProtoSlice,
  sort: ArrayProtoSort,
  toSorted: ArrayProtoToSorted
} = Array.prototype
const { apply: ReflectApply } = Reflect
const TypeErrorCtor = TypeError

// Create a collator for locale-sensitive string comparison
const { compare: localeCompare } = new Intl.Collator()

module.exports =
  typeof ArrayProtoToSorted === 'function'
    ? ArrayProtoToSorted
    : // Based on the following specification text:
      // https://tc39.es/ecma262/#sec-array.prototype.tosorted
      function toSorted(comparator) {
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeError('`toSorted` is not a constructor')
        }
        // Step 1: If comparator is not `undefined` and IsCallable(comparator)
        // is `false`, throw a TypeError exception.
        if (comparator !== undefined && typeof comparator !== 'function') {
          throw new TypeErrorCtor('Comparator must be a function or undefined')
        }
        // Step 2: Let O be ToObject(this value).
        // Step 3: Let len be LengthOfArrayLike(O).
        // Step 4: Let A be ArrayCreate(len).
        const A = ReflectApply(ArrayProtoSlice, this, [])
        // Step 5: Let SortCompare be a new Abstract Closure with parameters (x, y)
        // that captures comparator and performs the following steps when called.
        // Step 6: Let sortedList be SortIndexedProperties(O, len, SortCompare, read-through-holes).
        // Step 7: Let j be 0.
        // Step 8: Repeat, while j < len
        // Step 8a: Perform CreateDataPropertyOrThrow(A, ToString(j), sortedList[j]).
        // Step 8b: Set j to j + 1.
        // Step 9: Return A.
        return ReflectApply(ArrayProtoSort, A, [
          typeof comparator === 'function' ? comparator : localeCompare
        ])
      }
