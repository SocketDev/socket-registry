'use strict'

const getByteLength = Object.getOwnPropertyDescriptor(
  DataView.prototype,
  'byteLength',
).get

module.exports = function dataViewByteLength(dv) {
  try {
    return getByteLength.call(dv)
  } catch {}
  throw new TypeError('not a DataView')
}
