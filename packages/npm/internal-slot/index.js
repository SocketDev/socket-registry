'use strict'

const channel = new WeakMap()
const { hasOwn: ObjectHasOwn } = Object

function check(O, slot) {
  if (O === null || (typeof O !== 'object' && typeof O !== 'function')) {
    throw new TypeError('`O` is not an object')
  }
  if (typeof slot !== 'string') {
    throw new TypeError('`slot` must be a string')
  }
}

function has(O, slot) {
  check(O, slot)
  const slots = channel.get(O)
  return slots !== undefined && ObjectHasOwn(slots, slot)
}

module.exports = Object.freeze({
  assert(O, slot) {
    check(O, slot)
    if (channel.has(O) === undefined) {
      throw new TypeError('Side channel does not contain the given key')
    }
    if (!has(O, slot)) {
      throw new TypeError(`"${slot}" is not present on "O"`)
    }
  },
  check,
  has,
  get(O, slot) {
    check(O, slot)
    return channel.get(O)?.[slot]
  },
  set(O, slot, value) {
    check(O, slot)
    let slots = channel.get(O)
    if (slots === undefined) {
      slots = { __proto__: null }
      channel.set(O, slots)
    }
    slots[slot] = value
  }
})
