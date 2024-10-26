'use strict'

const {
  ReflectApply,
  TypeErrorCtor,
  createIteratorFromClosure,
  getIteratorFlattenable,
  setUnderlyingIterator
} = require('../shared')

module.exports = function from(O) {
  if (new.target) {
    throw new TypeErrorCtor('`Iterator.from` is not a constructor')
  }
  const { iterator, next } = getIteratorFlattenable(O)
  const wrapper = createIteratorFromClosure({
    next() {
      return ReflectApply(next, iterator, [])
    }
  })
  setUnderlyingIterator(wrapper, iterator)
  return wrapper
}
