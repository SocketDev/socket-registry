'use strict'

const {
  ReflectApply,
  TypeErrorCtor,
  ensureObject,
  getIteratorDirect
} = require('../shared')

module.exports = function toArray() {
  // Built-in functions that are not identified as constructors do
  // not implement [[Construct]] unless otherwise specified.
  // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
  if (new.target) {
    throw new TypeErrorCtor('`toArray` is not a constructor')
  }
  // Step 1: Let O be the this value.
  const O = this
  // Step 2: If O is not an Object, throw a TypeError exception.
  ensureObject(O)
  // Step 3: Let iterated be GetIteratorDirect(O).
  const { iterator, next } = getIteratorDirect(this)
  // Step 4: Let items be a new empty List.
  const items = []
  // Step 5: Repeat.
  while (true) {
    // Step 5.a: Let value be IteratorStepValue(iterated).
    const result = ReflectApply(next, iterator, [])
    // Step 5.b: If value is done, return CreateArrayFromList(items).
    if (result.done) {
      return items
    }
    // Step 5.c: Append value to items.
    items[items.length] = result.value
  }
}
