'use strict'

const ArrayIteratorPrototype = Reflect.getPrototypeOf([][Symbol.iterator]())
const IteratorPrototype = Reflect.getPrototypeOf(ArrayIteratorPrototype)

module.exports = IteratorPrototype
