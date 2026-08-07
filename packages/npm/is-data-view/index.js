'use strict'

// The buffer getter requires the [[DataView]] internal slot but, unlike the
// byteLength getter, does not throw for a detached or out-of-bounds view.
const getBuffer = Object.getOwnPropertyDescriptor(
  DataView.prototype,
  'buffer',
).get

module.exports = function isDataView(value) {
  try {
    getBuffer.call(value)
    return true
  } catch {}
  return false
}
