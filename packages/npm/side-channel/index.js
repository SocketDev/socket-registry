'use strict'

module.exports = function getSideChannel() {
  let map
  let wm
  const channel = {
    assert(key) {
      if (!channel.has(key)) {
        throw new TypeError('Side channel does not contain the given key')
      }
    },
    has(key) {
      return key !== null &&
        (typeof key === 'object' || typeof key === 'function')
        ? !!wm?.has(key)
        : !!map?.has(key)
    },
    get(key) {
      return key !== null &&
        (typeof key === 'object' || typeof key === 'function')
        ? wm?.get(key)
        : map?.get(key)
    },
    set(key, value) {
      if (
        key !== null &&
        (typeof key === 'object' || typeof key === 'function')
      ) {
        if (wm === undefined) {
          wm = new WeakMap()
        }
        wm.set(key, value)
      } else {
        if (map === undefined) {
          map = new Map()
        }
        map.set(key, value)
      }
    }
  }
  return channel
}
