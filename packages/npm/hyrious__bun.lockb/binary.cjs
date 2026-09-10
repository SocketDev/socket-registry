'use strict'

function str(a, buffers) {
  if ((a[7] & 128) === 0) {
    const i = a.indexOf(0)
    if (i >= 0) {
      a = a.subarray(0, i)
    }
    return new TextDecoder().decode(a)
  }
  const { 0: off, 1: len } = to_u32(a)
  return new TextDecoder().decode(
    buffers.string_bytes.subarray(off, off + (len & ~2_147_483_648)),
  )
}

function to_u32(a) {
  if (a.byteOffset % 4 === 0) {
    return new Uint32Array(a.buffer, a.byteOffset, a.byteLength / 4)
  }
  const view2 = new DataView(a.buffer, a.byteOffset, a.byteLength)
  return Uint32Array.from({ length: a.byteLength / 4 }, (_, i) =>
    view2.getUint32(i * 4, true),
  )
}

module.exports = { str, to_u32 }
