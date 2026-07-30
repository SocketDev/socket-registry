'use strict'

const getByteLength = Object.getOwnPropertyDescriptor(
  DataView.prototype,
  'byteLength',
).get

module.exports = function isDataView(value) {
  try {
    getByteLength.call(value)
    return true
  } catch {}
  return false
}
