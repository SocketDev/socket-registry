'use strict'

const getByteOffset = Object.getOwnPropertyDescriptor(
  DataView.prototype,
  'byteOffset',
).get

module.exports = function dataViewByteOffset(dv) {
  try {
    return getByteOffset.call(dv)
  } catch {}
  throw new TypeError('not a DataView')
}
