'use strict'

const getBuffer = Object.getOwnPropertyDescriptor(
  DataView.prototype,
  'buffer',
).get

module.exports = function dataViewBuffer(dv) {
  try {
    return getBuffer.call(dv)
  } catch {}
  throw new TypeError('not a DataView')
}
