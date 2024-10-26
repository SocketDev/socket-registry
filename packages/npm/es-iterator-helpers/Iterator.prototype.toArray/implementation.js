'use strict'

const {
  ReflectApply,
  TypeErrorCtor,
  ensureObject,
  getIteratorDirect
} = require('../shared')

module.exports = function toArray() {
  if (new.target) {
    throw new TypeErrorCtor('`toArray` is not a constructor')
  }
  ensureObject(this)
  const { iterator, next } = getIteratorDirect(this)
  const items = []
  while (true) {
    const result = ReflectApply(next, iterator, [])
    if (result.done) {
      return items
    }
    items[items.length] = result.value
  }
}
