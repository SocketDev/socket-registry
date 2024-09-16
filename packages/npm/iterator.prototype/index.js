'use strict'

const arrayIterator = [][Symbol.iterator]()
const ArrayIteratorPrototype = Reflect.getPrototypeOf(arrayIterator)
const IteratorPrototype = Reflect.getPrototypeOf(ArrayIteratorPrototype)

module.exports = IteratorPrototype
